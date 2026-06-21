#!/usr/bin/env python3
"""Codes&More — Ordinance-or-Law reports backend (12² AI).

A peer product: produces an O&L requirements report for ANY address, links it to
the shared Job (crm_properties / core_jobs), and contributes a crm_deliverables
row so it appears on the same job as Fieldcam photos and HailScan reports. Gated
behind the 'codesandmore' entitlement. Same stack: stdlib ThreadingHTTPServer +
single-file dashboard + Supabase. Report PDF via pdf.py (Playwright).
"""
from __future__ import annotations

import argparse
import json
import math
import os
import re
import shutil
import sys
import threading
import time
import traceback
import uuid
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs

def _load_env_file() -> None:
    """Load KEY=VALUE lines from codesandmore/.env (if present) into os.environ —
    the service-role key is server-side only and must never be entered through a
    UI. Real environment variables win over the file. Must run before cmdata/
    entitlements/provision import (they read env at import time)."""
    env_path = Path(__file__).resolve().parent.parent / ".env"
    try:
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, val = line.split("=", 1)
            os.environ.setdefault(key.strip(), val.strip().strip('"').strip("'"))
    except FileNotFoundError:
        pass


_load_env_file()

sys.path.insert(0, str(Path(__file__).resolve().parent))
from auth import verify_supabase_jwt, AuthError  # noqa: E402
import billing  # noqa: E402
import cmdata  # noqa: E402
import cmlibrary  # noqa: E402
import entitlements  # noqa: E402
import hazards  # noqa: E402
import jurisdiction  # noqa: E402
import minimap  # noqa: E402
import provision  # noqa: E402
import trades  # noqa: E402

DASHBOARD = Path(__file__).resolve().parent.parent / "dashboard"
TEMPLATE = DASHBOARD / "template.html"
SIGNIN = DASHBOARD / "signin.html"
RESET = DASHBOARD / "reset.html"
LANDING = DASHBOARD / "landing.html"
SIGNUP = DASHBOARD / "signup.html"
TERMS = DASHBOARD / "terms.html"
PRIVACY = DASHBOARD / "privacy.html"
CM_PDF_DIR = Path(__file__).resolve().parent.parent / "data" / "cm_pdfs"

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://eitnccqaysidqvgudeeb.supabase.co").rstrip("/")
SUPABASE_ANON_KEY = os.environ.get(
    "SUPABASE_ANON_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpdG5jY3FheXNpZHF2Z3VkZWViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0NjAzODYsImV4cCI6MjA5NjAzNjM4Nn0.i9-7j0USLioV_p-ZKCfWTHS9SOxv54R1Jqg0lDTH94g",
)
SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", "")
SUPABASE_JWKS_URL = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json" if SUPABASE_URL else ""
# Secure by default: auth gating is ON unless local dev explicitly opts out
# with CODESANDMORE_REQUIRE_AUTH=0. With auth off, /api/cm/resolve serves the
# FULL payload (editions, local adoptions) to anonymous callers — see the
# startup warning in main().
REQUIRE_AUTH = (
    os.environ.get("CODESANDMORE_REQUIRE_AUTH", "1") == "1"
    and bool(SUPABASE_JWKS_URL or SUPABASE_JWT_SECRET)
)
ENFORCE_ENTITLEMENT = (
    os.environ.get("CODESANDMORE_ENFORCE_ENTITLEMENT", "1" if REQUIRE_AUTH else "0") == "1"
)
_EXEMPT = {"/api/me", "/api/products", "/api/products/add",
           "/api/billing/config", "/api/billing/checkout",
           "/api/billing/portal"}

# --- public (unauthenticated) per-IP rate limiters ----------------------------
# Simple in-process rolling-window buckets. Behind a reverse proxy, set
# CODESANDMORE_TRUSTED_PROXY=1 so the limiter keys on the X-Forwarded-For hop the
# trusted proxy appended; otherwise every visitor shares the proxy's IP/bucket.
# The flag defaults OFF so the header can't be spoofed on direct connections.
TRUSTED_PROXY = os.environ.get("CODESANDMORE_TRUSTED_PROXY", "0") == "1"


class _IPRateLimiter:
    """Per-IP rolling-window limiter: `limit` hits per `window` seconds."""

    def __init__(self, limit: int, window: float):
        self.limit, self.window = limit, window
        self._lock = threading.Lock()
        self._hits: dict[str, list[float]] = {}

    def allow(self, ip: str) -> bool:
        """True (and records the hit) if `ip` is under the cap."""
        now = time.time()
        with self._lock:
            hits = [t for t in self._hits.get(ip, ()) if now - t < self.window]
            allowed = len(hits) < self.limit
            if allowed:
                hits.append(now)
            self._hits[ip] = hits
            if len(self._hits) > 2048:  # keep the table bounded
                for k in [k for k, v in self._hits.items()
                          if not v or now - v[-1] > self.window]:
                    self._hits.pop(k, None)
            return allowed


_resolve_limiter = _IPRateLimiter(10, 3600.0)  # landing-teaser lookups
_signup_limiter = _IPRateLimiter(5, 3600.0)    # signup creates real users/orgs — stricter
_coverage_limiter = _IPRateLimiter(30, 3600.0)  # public coverage map (separate bucket)


# --- public coverage (unauthenticated; gating-safe fields ONLY) ---------------
# In-process cache: one Supabase round-trip per 5 minutes serves every visitor;
# on Supabase failure the last good payload keeps serving (else 503 and the
# landing map collapses to its fallback).
_COVERAGE_TTL = 300.0
_coverage_lock = threading.Lock()
_coverage_cache: dict = {"at": 0.0, "payload": None}

# Allowlist mirroring _teaser_payload's gating discipline (William's standing
# rule): the public surface may carry state name, confidence tier, verified
# date, counts — NEVER residential/commercial code or edition strings, never
# sources, never amendment/agency detail.
_COVERAGE_STATE_KEYS = {"abbr", "name", "confidence", "verified_at"}


def _build_coverage() -> dict:
    """Assemble the /api/public/coverage payload LIVE from cm_state_adoptions
    (coverage-safe columns only — see cmdata.COVERAGE_COLUMNS)."""
    rows = cmdata.list_state_coverage()
    states, tiers = [], {"high": 0, "medium": 0, "low": 0}
    for r in rows:
        conf = str(r.get("confidence") or "").lower()
        if conf in tiers:
            tiers[conf] += 1
        states.append({"abbr": r.get("state_abbr"), "name": r.get("state_name"),
                       "confidence": r.get("confidence"), "verified_at": r.get("verified_at")})
    # unit-style assertion: nothing beyond the public allowlist ever ships
    for s in states:
        assert set(s) <= _COVERAGE_STATE_KEYS, f"gated field on public surface: {set(s) - _COVERAGE_STATE_KEYS}"
    return {
        "states": states,
        "totals": {"states": len(states), **tiers},
        "dataset_version": max((s["verified_at"] for s in states if s["verified_at"]),
                               default=None),
    }


def _coverage_stats_sentence() -> str:
    """Real coverage totals as one uppercase sentence for the landing page's
    server-rendered <noscript> block (__CM_COVERAGE_STATS__). Uses/refreshes the
    same cache as /api/public/coverage; ANY failure (cold cache + Supabase down,
    not configured) falls back to a neutral, data-free sentence so the landing
    page itself can never break."""
    try:
        now = time.time()
        with _coverage_lock:
            payload = _coverage_cache["payload"]
            fresh = payload is not None and now - _coverage_cache["at"] < _COVERAGE_TTL
        if not fresh:
            payload = _build_coverage()
            with _coverage_lock:
                _coverage_cache.update(at=time.time(), payload=payload)
        t = payload["totals"]
        ds = str(payload.get("dataset_version") or "")[:10]
        sentence = (f"{t['states']} STATES ON FILE · {t['high']} HIGH · "
                    f"{t['medium']} MEDIUM")
        if ds:
            sentence += f" · COVERAGE AS OF {ds}"
        return sentence + " — EVERY ROW CARRIES A CONFIDENCE TIER AND A VERIFIED DATE."
    except Exception:  # noqa: BLE001 — the landing page must always render
        return ("EVERY STATE ADOPTION ROW CARRIES A CONFIDENCE TIER AND A "
                "VERIFIED DATE — LIVE TOTALS REQUIRE JAVASCRIPT.")


# --- jurisdiction boundary (authed; shared TIGERweb fetch via minimap) --------
# Boundaries don't change intra-day: geoid-keyed in-process cache, 24h TTL,
# bounded at 256 entries. Failures are NOT cached (next request retries).
_BOUNDARY_TTL = 24 * 3600.0
_BOUNDARY_MAX = 256
_boundary_lock = threading.Lock()
_boundary_cache: dict[str, tuple[float, dict]] = {}


def _fetch_boundary_cached(fips: str) -> dict | None:
    now = time.time()
    with _boundary_lock:
        hit = _boundary_cache.get(fips)
        if hit and now - hit[0] < _BOUNDARY_TTL:
            return hit[1]
    fetched = minimap.fetch_ring(fips)  # shared with the PDF minimap — one URL set
    if fetched:
        with _boundary_lock:
            if len(_boundary_cache) >= _BOUNDARY_MAX:
                oldest = min(_boundary_cache, key=lambda k: _boundary_cache[k][0])
                _boundary_cache.pop(oldest, None)
            _boundary_cache[fips] = (now, fetched)
    return fetched


def _normalize_ring(ring: list, lat: float | None = None, lon: float | None = None,
                    box: float = 1000.0) -> tuple[list, list | None]:
    """Project a lon/lat ring into a box×box viewBox (equirectangular with the
    same cos-lat correction minimap uses), aspect-preserved and centered.
    Returns (ring_px, pin_px) — pin is None when lat/lon are absent."""
    lats = [p[1] for p in ring]
    lons = [p[0] for p in ring]
    lat0 = (min(lats) + max(lats)) / 2.0
    lon0 = (min(lons) + max(lons)) / 2.0
    coslat = math.cos(math.radians(lat0)) or 1e-9

    def project(plon: float, plat: float) -> tuple[float, float]:
        return ((plon - lon0) * coslat, -(plat - lat0))

    pts = [project(p[0], p[1]) for p in ring]
    pin = project(lon, lat) if lat is not None and lon is not None else None
    xs = [p[0] for p in pts] + ([pin[0]] if pin else [])
    ys = [p[1] for p in pts] + ([pin[1]] if pin else [])
    minx, maxx, miny, maxy = min(xs), max(xs), min(ys), max(ys)
    spanx, spany = (maxx - minx) or 1e-9, (maxy - miny) or 1e-9
    scale = min(box / spanx, box / spany)
    offx = (box - spanx * scale) / 2.0 - minx * scale
    offy = (box - spany * scale) / 2.0 - miny * scale

    def px(p: tuple[float, float]) -> list:
        return [round(p[0] * scale + offx, 1), round(p[1] * scale + offy, 1)]

    return [px(p) for p in pts], (px(pin) if pin else None)


def _float_or_none(v) -> float | None:
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _teaser_payload(full: dict) -> dict:
    """Trim the full /api/cm/resolve payload for UNAUTHENTICATED landing-page
    callers: no coordinates, no requirement text/sections — the library preview
    collapses to a count plus two example titles. Climate zone stays (teaser line)."""
    juris = {k: v for k, v in (full.get("jurisdiction") or {}).items()
             if k not in ("lat", "lon")}
    preview = full.get("library_requirements")
    if preview:
        titles = []
        for row in (preview.get("sample") or [])[:2]:
            t = str(row.get("requirement") or "").split(":", 1)[0].strip()
            if t:
                titles.append(t)
        # no code/edition on the public surface — the adopted code is gated. The
        # home_rule boolean is gating-safe (no edition/posture text) and lets the
        # public teaser stay honest when a state names no statewide edition.
        preview = {"count": preview.get("count", 0), "example_titles": titles,
                   "home_rule": bool(preview.get("home_rule"))}
    hz = full.get("hazards") or {}
    climate = hz.get("climate_zone") if isinstance(hz, dict) else None
    return {
        "jurisdiction": juris,
        # adopted-code data is signed-in only (William, 2026-06-10): never ship
        # the adoption row to unauthenticated callers, only whether one exists
        "state_adoption": None,
        "adoption_gated": bool(full.get("state_adoption")),
        # internal error strings (Supabase/config detail) never ship on the
        # public surface — collapse to a generic constant
        "adoption_lookup_error": ("adoption data unavailable"
                                  if full.get("adoption_lookup_error") else None),
        "climate_zone": climate,
        "library_requirements": preview,
        "disclaimers": full.get("disclaimers") or [],
    }


_report_jobs_lock = threading.Lock()
_report_jobs: dict[str, dict] = {}
_REPORT_JOB_TTL = 24 * 3600  # seconds; finished jobs + PDFs evicted after this


def _prune_report_jobs() -> None:
    """Evict completed/errored jobs from the in-memory map after the TTL.

    The on-disk PDF is KEPT — `data/cm_pdfs/` is a durable cache, not a temp dir.
    The file route re-authorizes any pruned job via its persisted cm_reports row
    and, if the cached file is ever gone (restart, prune, or a fresh box), it
    REGENERATES the PDF from the durable report data. So a report's PDF is
    available to the user at all times; only the in-memory bookkeeping is bounded.
    Caller must hold _report_jobs_lock."""
    cutoff = time.time() - _REPORT_JOB_TTL
    for jid, j in list(_report_jobs.items()):
        if j.get("status") in ("ready", "error") and j.get("created_at", 0) < cutoff:
            _report_jobs.pop(jid, None)


_REPORT_ID_RE = re.compile(r"^[0-9a-fA-F-]{8,}$")
_CODE_CYCLE_RE = re.compile(r"\b(IRC|IBC)\b[\s-]*([0-9]{4})", re.I)


def _parse_code_cycle(text: str | None) -> tuple[str | None, str | None]:
    """'IRC 2021' / 'irc-2021' -> ('IRC', '2021'); else (None, None)."""
    m = _CODE_CYCLE_RE.search(text or "")
    return (m.group(1).upper(), m.group(2)) if m else (None, None)


def _suggest_cycle(adoption: dict | None) -> tuple[str | None, str | None, str | None]:
    """(code, edition, label) from a cm_state_adoptions row; residential first.

    Delegates to cmlibrary.suggest_cycle so resolve, report-create, and PDF render
    all derive the cycle (and detect home-rule) from one source of truth.
    """
    return cmlibrary.suggest_cycle(adoption)


def _best_local(locals_: list[dict], stack: dict) -> dict | None:
    """Most-specific local adoption for the resolved address: an exact place-FIPS
    match wins over a county-FIPS match. get_local_adoptions already filtered to
    the resolved state + (county_fips, place_fips), so these are candidates only.
    Verified (Tier-3) rows are preferred over BCAT-reported (Tier-2) at the same
    level so human curation always overrides the machine import."""
    pf, cf = stack.get("place_fips"), stack.get("county_fips")

    def _pick(rows: list[dict]) -> dict | None:
        if not rows:
            return None
        return sorted(rows, key=lambda r: r.get("status") == "verified", reverse=True)[0]

    place = _pick([r for r in locals_ if r.get("level") == "place" and pf and r.get("fips") == pf])
    if place:
        return place
    return _pick([r for r in locals_ if r.get("level") == "county" and cf and r.get("fips") == cf])


def _resolve_lookup(body: dict, token: str | None) -> dict:
    """POST /api/cm/resolve — jurisdiction stack + adoption row + library preview.

    Degrades gracefully: the resolver and library parts always return even when
    the adoption-store lookup fails (no service key / no token / Supabase down).
    """
    address = (body.get("address") or "").strip() or None
    zip5 = (body.get("zip") or body.get("zip5") or "").strip() or None
    if not address and not zip5:
        raise cmdata.CMError(400, "address or zip is required")
    stack = jurisdiction.resolve(address, zip5)

    adoption, locals_, adoption_error = None, [], None
    if stack.get("state_abbr"):
        try:
            adoption = cmdata.get_state_adoption(stack["state_abbr"], token)
            locals_ = cmdata.get_local_adoptions(
                stack["state_abbr"], [stack.get("county_fips"), stack.get("place_fips")], token)
        except (cmdata.CMNotConfigured, cmdata.CMError) as e:
            adoption_error = str(e)

    # Prefer a matched LOCAL adoption (place > county) over the state baseline.
    # This is what makes per-jurisdiction requirements resolve — e.g. a Dallas TX
    # address now yields the city's BCAT-reported IRC/IBC edition instead of the
    # "no statewide edition" home-rule fallback.
    local_match = _best_local(locals_, stack)
    code, edition, cycle = _suggest_cycle(adoption)
    if local_match:
        lc, le, lcyc = cmlibrary.suggest_cycle(local_match)
        if lc and le:
            code, edition, cycle = lc, le, lcyc

    # Site hazard profile (climate zone embed, seismic via USGS, wind/snow
    # link-out per the research matrix). hazards_for never raises; the guard
    # keeps the resolver alive even if the hazard layer itself breaks. Run it
    # on a thread so the USGS round-trip (up to its 10s timeout) overlaps the
    # local library-preview work instead of extending the serial chain.
    hazard_box: dict = {}

    def _hazard_worker() -> None:
        try:
            hazard_box["hazards"] = hazards.hazards_for(
                stack.get("lat"), stack.get("lon"), stack.get("county_fips"),
                code_edition=edition)
        except Exception as e:  # noqa: BLE001 — overlay must never sink /resolve
            hazard_box["hazards"] = None
            traceback.print_exc()
            print(f"  hazards_for failed: {e}", flush=True)

    hazard_thread = threading.Thread(target=_hazard_worker, daemon=True)
    hazard_thread.start()

    preview, rows = None, None
    if code and edition:
        try:
            rows = cmlibrary.requirements_for(None, code, edition)
        except (LookupError, OSError, ValueError) as e:
            preview = {"count": 0, "code": code, "edition": edition, "error": str(e)}

    hazard_thread.join()
    site_hazards = hazard_box.get("hazards")

    if rows is not None:
        try:
            rows = cmlibrary.apply_hazard_conditions(rows, site_hazards)
        except Exception as e:  # noqa: BLE001 — overlay is best-effort
            traceback.print_exc()
            print(f"  apply_hazard_conditions failed: {e}", flush=True)
        preview = {"count": len(rows), "code": code, "edition": edition,
                   "code_source": rows[0]["code_source"] if rows else cycle,
                   "sample": rows[:6]}
        if local_match:
            # Provenance for the matched jurisdiction (court-admissibility: cite
            # the source + tier; never label a BCAT-reported row 'verified').
            preview["jurisdiction_name"] = local_match.get("name")
            preview["jurisdiction_level"] = local_match.get("level")
            preview["jurisdiction_tier"] = ("verified"
                                            if local_match.get("status") == "verified"
                                            else "bcat_reported")
            preview["jurisdiction_sources"] = local_match.get("sources") or []

    # Home-rule / no statewide adopted edition: we cannot cite an adopted code
    # edition for this address, and presenting an unadopted model edition as law
    # would be inaccurate and legally unsafe (legal_posture.md §1.1). Never leave
    # the lookup silently empty — fall back to the enacted, nationwide federal
    # layer (CFR-cited) plus an honest notice that the AHJ sets the edition.
    if preview is None and stack.get("state_abbr"):
        fed = cmlibrary.federal_requirements(None)
        preview = {
            "count": len(fed),
            "code": None,
            "edition": None,
            "home_rule": True,
            "notice": cmlibrary.home_rule_notice(stack.get("state_name"), adoption),
            "code_source": "Federal",
            "sample": fed[:6],
        }

    # research-provenance `sources` arrays stay internal — never in the public API
    adoption_public = {k: v for k, v in adoption.items() if k != "sources"} if adoption else None
    locals_public = [{k: v for k, v in row.items() if k != "sources"} for row in locals_]

    # Per-trade preview: when the caller names trades, resolve each trade's
    # adopted code/edition (building trades reuse the cycle above; others go
    # through cmadoption per discipline) and attach a tiny count+sample preview.
    # Back-compat: only added when `trades` is present in the body.
    trade_ids = body.get("trades") or []
    trade_previews = None
    if trade_ids:
        import cmadoption
        plan = _trade_build_plan(
            trade_ids, building_cycle=(code, edition),
            resolve_discipline=lambda disc: cmadoption.resolve(disc, stack, token=token))
        trade_previews = []
        for tid in trade_ids:
            p = plan.get(tid)
            if p is None:  # unknown trade id — skipped by _trade_build_plan
                continue
            t_code, t_edition = p.get("code"), p.get("edition")
            ahj_confirm = bool(p.get("ahj_confirm"))
            count, sample = 0, []
            if t_code and t_edition:
                try:
                    t_rows = cmlibrary.requirements_for(tid, t_code, t_edition)
                    count = len(t_rows)
                    sample = [r.get("section") for r in t_rows[:3]]
                except (LookupError, OSError, ValueError):
                    ahj_confirm = True
            else:
                ahj_confirm = True
            trade_previews.append({
                "trade": tid,
                "label": trades.trade(tid)["label"],
                "code": t_code,
                "edition": t_edition,
                "count": count,
                "sample": sample,
                "ahj_confirm": ahj_confirm,
                "confidence": p.get("confidence"),
            })

    juris_name = ", ".join(filter(None, [
        stack.get("place_name"), stack.get("county_name"), stack.get("state_name")])) or None
    result = {
        "jurisdiction": stack,
        "state_adoption": adoption_public,
        "local_adoptions": locals_public,
        "adoption_lookup_error": adoption_error,
        "suggested_code_cycle": cycle,
        "hazards": site_hazards,
        "library_requirements": preview,
        "disclaimers": cmlibrary.render_disclaimers(
            (adoption or {}).get("verified_at"), juris_name),
    }
    if trade_previews is not None:
        result["trade_previews"] = trade_previews
    return result


def _trade_build_plan(trade_ids: list[str], building_cycle: tuple,
                      resolve_discipline) -> dict:
    """Per-trade {code, edition, ahj_confirm}. building-discipline trades use
    building_cycle (from code_cycle/_suggest_cycle); others call
    resolve_discipline(discipline) -> {code, edition, ahj_confirm}."""
    import trades as trademod
    b_code, b_edition = building_cycle
    plan: dict[str, dict] = {}
    for tid in trade_ids:
        try:
            disc = trademod.trade(tid)["discipline"]
        except KeyError:
            continue
        if disc == "building":
            plan[tid] = {"code": b_code, "edition": b_edition,
                         "ahj_confirm": not (b_code and b_edition)}
        else:
            r = resolve_discipline(disc)
            plan[tid] = {"code": r.get("code"), "edition": r.get("edition"),
                         "ahj_confirm": bool(r.get("ahj_confirm") or not (r.get("code") and r.get("edition")))}
    return plan


def _create_report(body: dict, token: str | None, caller=None) -> dict:
    """POST /api/cm/reports — create; with auto_populate:true bulk-insert the
    library requirements for each selected trade (per-discipline adopted
    edition) onto the new report."""
    import cmadoption, cmlibrary, trades as trademod
    auto = bool(body.pop("auto_populate", False))
    trade_ids = body.get("trades") or []
    lib_code, lib_edition = body.pop("library_code", None), body.pop("library_edition", None)
    report = cmdata.create_report(body, token, caller=caller)
    if auto and report.get("id") and trade_ids:
        code, edition = _parse_code_cycle(body.get("code_cycle"))
        if not code and lib_code and lib_edition:
            code, edition = str(lib_code).upper(), str(lib_edition)
        stack = {}
        try:
            stack = jurisdiction.resolve(
                ", ".join(filter(None, [body.get("address"), body.get("city"), body.get("state")])) or None,
                body.get("zip"))
        except Exception:
            stack = {"state_abbr": body.get("state")}
        plan = _trade_build_plan(
            trade_ids, building_cycle=(code, edition),
            resolve_discipline=lambda disc: cmadoption.resolve(disc, stack, token=token))
        all_rows, errors = [], {}
        had_cycle = False
        for tid, p in plan.items():
            if not (p["code"] and p["edition"]):
                errors[tid] = "edition adopted per AHJ — confirm locally"
                continue
            had_cycle = True
            try:
                all_rows.extend(cmlibrary.requirements_for(tid, p["code"], p["edition"]))
            except (LookupError, OSError, ValueError) as e:
                errors[tid] = str(e)
        # Home-rule jurisdiction: no trade resolved a citeable statewide edition.
        # Seed the enacted federal layer so the deliverable is never empty. The
        # honest "no statewide edition" notice is generated at PDF-render time
        # (cmreport detects home rule from the adoption row), so nothing unsafe is
        # persisted onto the text `jurisdiction` field.
        home_rule = not had_cycle and bool(stack.get("state_abbr"))
        if home_rule:
            all_rows.extend(cmlibrary.federal_requirements(None))
            try:
                hr_adoption = cmdata.get_state_adoption(stack["state_abbr"], token)
            except Exception:
                hr_adoption = None
            report["home_rule"] = True
            report["home_rule_notice"] = cmlibrary.home_rule_notice(
                stack.get("state_name"), hr_adoption)
        inserted = cmdata.add_requirements(report["id"], all_rows, token, caller=caller) if all_rows else []
        report["auto_populated"] = len(inserted)
        if errors:
            report["trade_notes"] = errors
    return report


def render_shell() -> str:
    config = {"supabaseUrl": SUPABASE_URL or "https://eitnccqaysidqvgudeeb.supabase.co",
              "supabaseAnonKey": SUPABASE_ANON_KEY, "requireAuth": REQUIRE_AUTH}
    return TEMPLATE.read_text().replace("__CODESANDMORE_CONFIG__", json.dumps(config))


def _run_report_job(job_id: str, report_id: str, token: str | None, caller=None) -> None:
    import cmreport
    CM_PDF_DIR.mkdir(parents=True, exist_ok=True)
    out_path = CM_PDF_DIR / f"{job_id}.pdf"

    def progress(stage, frac):
        with _report_jobs_lock:
            j = _report_jobs.get(job_id)
            if j is not None:
                j["stage"] = stage
                j["progress"] = max(0.0, min(1.0, float(frac)))

    with _report_jobs_lock:
        _report_jobs[job_id].update(status="running", stage="assembling")
    try:
        result = cmreport.render_cm_report(report_id, out_path, token=token, progress=progress,
                                           caller=caller)
        file_url = f"/api/cm-report/file?job_id={job_id}"
        try:
            cmdata.attach_deliverable(result["report"], job_id, file_url, token=token, caller=caller)
            cmdata.update_report(report_id, {"status": "ready", "job_id": job_id, "file_url": file_url},
                                 token=token, caller=caller)
        except Exception:
            traceback.print_exc()  # PDF done; bookkeeping best-effort
        with _report_jobs_lock:
            _report_jobs[job_id].update(status="ready", progress=1.0, stage="ready",
                                        filename=result.get("filename"), pages=result.get("pages"))
    except Exception as e:
        traceback.print_exc()
        with _report_jobs_lock:
            _report_jobs[job_id].update(status="error", error=str(e))


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        print(f"  {self.address_string()} {fmt % args}", flush=True)

    def _send_json(self, status, payload, cache_control: str = "no-store"):
        body = json.dumps(payload, separators=(",", ":")).encode()
        self.send_response(status); self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", cache_control); self.send_header("Content-Length", str(len(body)))
        self.end_headers(); self.wfile.write(body)

    def _send_html(self, status, html):
        body = html.encode()
        self.send_response(status); self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body))); self.end_headers(); self.wfile.write(body)

    def _send_file(self, path: Path, filename: str, content_type: str):
        if not path.exists():
            self._send_json(404, {"error": "file not found"}); return
        self.send_response(200); self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(path.stat().st_size))
        self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
        self.end_headers()
        with open(path, "rb") as f:
            shutil.copyfileobj(f, self.wfile)

    def _json_body(self):
        n = int(self.headers.get("Content-Length", "0") or "0")
        return json.loads(self.rfile.read(n) or b"{}") if n else {}

    def _bearer(self):
        h = self.headers.get("Authorization", "")
        return h[7:].strip() if h.lower().startswith("bearer ") else None

    def _client_ip(self) -> str:
        """Rate-limit key. With CODESANDMORE_TRUSTED_PROXY=1, prefer the
        Cloudflare edge's CF-Connecting-IP (the true client), falling back to the
        last X-Forwarded-For hop only if it's absent; otherwise use the direct
        TCP peer so the header can't be spoofed. Behind the Cloudflare tunnel the
        TCP peer is always 127.0.0.1 and the last X-Forwarded-For hop is the CF
        edge IP, so keying on it would collapse every client into one bucket."""
        if TRUSTED_PROXY:
            cf = (self.headers.get("CF-Connecting-IP") or "").strip()
            if cf:
                return cf
            xff = (self.headers.get("X-Forwarded-For") or "").strip()
            if xff:
                return xff.split(",")[-1].strip() or self.client_address[0]
        return self.client_address[0]

    def _authenticate(self):
        # handler instances are reused across keep-alive requests (and behind a
        # multiplexing proxy, across users) — never carry caller/claims over
        self._cc = None
        self.user_claims = None
        if not REQUIRE_AUTH:
            return True
        tok = self._bearer()
        if not tok:
            self._send_json(401, {"error": "authentication required"}); return False
        try:
            self.user_claims = verify_supabase_jwt(tok, secret=SUPABASE_JWT_SECRET or None, jwks_url=SUPABASE_JWKS_URL or None)
            return True
        except AuthError as e:
            self._send_json(401, {"error": f"invalid token: {e}"}); return False

    def _caller(self):
        if getattr(self, "_cc", None) is not None:
            return self._cc
        claims = getattr(self, "user_claims", None) or {}
        try:
            self._cc = entitlements.resolve(claims.get("sub"), self._bearer(), claims.get("email"))
        except entitlements.EntitlementError:
            self._cc = entitlements.Caller(user_id=claims.get("sub"), email=claims.get("email"))
        return self._cc

    def _gate(self, path):
        if not ENFORCE_ENTITLEMENT or path in _EXEMPT:
            return True
        ok, status, msg = entitlements.product_gate(self._caller(), "codesandmore")
        if ok:
            return True
        self._send_json(status, {"error": msg, "code": "not_entitled"}); return False

    # --- self-serve products (auth-only; NO product gate) — mirrors fieldcam ---
    def _products_caller(self):
        """Resolve the caller for the /api/products surface. Sends the error
        response and returns None unless we have a real, resolvable identity."""
        claims = getattr(self, "user_claims", None) or {}
        if not claims.get("sub"):
            self._send_json(401, {"error": "authentication required"})
            return None
        try:
            return entitlements.resolve(claims.get("sub"), self._bearer(), claims.get("email"))
        except entitlements.EntitlementError as e:
            self._send_json(503, {"error": f"entitlements unavailable: {e}"})
            return None

    def handle_products_get(self):
        """GET /api/products — catalog + the caller's entitled products."""
        caller = self._products_caller()
        if caller is None:
            return
        self._send_json(200, {
            "products": entitlements.PRODUCT_CATALOG,
            "entitled": sorted(caller.all_products),
        })

    def handle_org_get(self):
        """GET /api/cm/org — the caller's org overview for the dashboard:
        org name/role + a member directory (user_id -> {email, name}) so report
        rows can say WHO created what instead of raw UUIDs. Strictly scoped to
        the caller's own org. Name/member resolution is best-effort: without the
        service key the directory comes back empty and the UI degrades."""
        caller = self._caller()
        if not getattr(caller, "user_id", None):
            self._send_json(401, {"error": "authentication required"}); return
        org_id = caller.primary_org_id
        if not org_id:
            self._send_json(200, {"org": None, "members": {}}); return
        name, members = None, {}
        try:
            rows = cmdata._req("GET", "core_orgs",
                               {"select": "id,name", "id": f"eq.{org_id}", "limit": "1"},
                               token=self._bearer()) or []
            name = rows[0].get("name") if rows else None
        except (cmdata.CMError, cmdata.CMNotConfigured):
            pass
        try:
            mrows = cmdata._req("GET", "core_org_members",
                                {"select": "user_id", "org_id": f"eq.{org_id}"},
                                token=self._bearer()) or []
            ids = {r["user_id"] for r in mrows if r.get("user_id")}
            if ids and provision.configured():
                _, payload = provision._req("GET", "/auth/v1/admin/users?per_page=200")
                users = (payload or {}).get("users", []) if isinstance(payload, dict) else []
                for u in users:
                    if u.get("id") in ids:
                        meta = u.get("user_metadata") or {}
                        members[u["id"]] = {"email": u.get("email"),
                                            "name": meta.get("full_name") or meta.get("name")}
        except (cmdata.CMError, cmdata.CMNotConfigured, provision.ProvisionError):
            pass
        self._send_json(200, {
            "org": {"id": org_id, "name": name, "role": caller.roles.get(org_id)},
            "members": members,
        })

    def handle_products_add(self):
        """POST /api/products/add {"product": ...} — owner/admin self-serve trial."""
        try:
            body = self._json_body()
        except (ValueError, json.JSONDecodeError) as e:
            self._send_json(400, {"error": f"bad json: {e}"}); return
        product = (body.get("product") or "").strip().lower()
        if product not in entitlements.PRODUCTS:
            self._send_json(400, {
                "error": f"unknown product; expected one of: {', '.join(entitlements.PRODUCTS)}",
            }); return
        caller = self._products_caller()
        if caller is None:
            return
        if not provision.configured():
            self._send_json(503, {
                "error": "Self-serve product add is not available: the server is "
                         "missing SUPABASE_SERVICE_ROLE_KEY.",
            }); return
        if not caller.org_ids:
            self._send_json(403, {
                "error": "no_org",
                "message": "No organization is associated with this account yet.",
            }); return
        org_id = caller.primary_org_id
        if caller.roles.get(org_id) not in ("owner", "admin"):
            self._send_json(403, {
                "error": "ask_admin",
                "message": "Only an organization owner or admin can add products. "
                           "Ask your administrator to add it.",
            }); return
        try:
            # Never overwrite a live entitlement: any existing non-terminal
            # status (active, trialing, past_due, …) is left untouched so
            # self-serve add can't mask billing state (idempotent 200). Only
            # absent or terminal (canceled/inactive) rows get a fresh trial.
            current = entitlements.entitlement_status(org_id, product, token=self._bearer())
            if current in (None, "", "canceled", "cancelled", "inactive"):
                status = "trialing"
                provision.grant_entitlement(org_id, product, status="trialing", source="self_serve")
            else:
                status = current
        except (provision.ProvisionError, entitlements.EntitlementError) as e:
            self._send_json(502, {"error": str(e)}); return
        entitlements.invalidate(caller.user_id)
        try:
            updated = entitlements.resolve(caller.user_id, self._bearer(), caller.email,
                                           name=caller.name)
            products = sorted(updated.all_products)
        except entitlements.EntitlementError:
            products = sorted(caller.all_products | {product})
        self._send_json(200, {"ok": True, "product": product,
                              "status": status, "products": products})

    # --- billing (Stripe; this product's own Stripe account) ------------------
    BILLING_PRODUCT = "codesandmore"
    BILLING_RETURN_PATH = "/app"   # where checkout/portal land back

    def handle_billing_config(self) -> None:
        """GET /api/billing/config — plans + whether checkout is live."""
        if self._products_caller() is None:
            return
        configured = billing.configured(self.BILLING_PRODUCT)
        self._send_json(200, {
            "configured": configured,
            "product": self.BILLING_PRODUCT,
            "plans": billing.plans_for_product(self.BILLING_PRODUCT),
            "portal": configured,
        })

    def _billing_org(self):
        """(caller, org_id) for an owner/admin, else (None, None) with the
        error response already sent."""
        caller = self._products_caller()
        if caller is None:
            return None, None
        if not caller.org_ids:
            self._send_json(402, {
                "error": "no_org",
                "message": "No organization is associated with this account yet.",
            }); return None, None
        org_id = caller.primary_org_id
        if caller.roles.get(org_id) not in ("owner", "admin"):
            self._send_json(403, {
                "error": "ask_admin",
                "message": "Only an organization owner or admin can manage billing.",
            }); return None, None
        return caller, org_id

    def _billing_origin(self) -> str:
        origin = (self.headers.get("Origin") or "").strip()
        if origin.startswith("http://") or origin.startswith("https://"):
            return origin.rstrip("/")
        host = (self.headers.get("Host") or "localhost").strip()
        return f"http://{host}"

    @staticmethod
    def _billing_err_status(e) -> int:
        s = getattr(e, "status", 502)
        return s if 400 <= s < 500 or s == 503 else 502

    def handle_billing_checkout(self) -> None:
        """POST /api/billing/checkout {plan, interval, state?} → {url}."""
        try:
            body = self._json_body()
        except (ValueError, json.JSONDecodeError) as e:
            self._send_json(400, {"error": f"bad json: {e}"}); return
        if not billing.configured(self.BILLING_PRODUCT):
            self._send_json(503, {"error": "billing not configured"}); return
        caller, org_id = self._billing_org()
        if caller is None:
            return
        plan = (body.get("plan") or "").strip().lower()
        interval = (body.get("interval") or "month").strip().lower()
        if interval not in ("month", "year"):
            self._send_json(400, {"error": "interval must be 'month' or 'year'"}); return
        if not billing.lookup_key_for(self.BILLING_PRODUCT, plan, interval):
            self._send_json(400, {
                "error": f"unknown plan {plan!r} for {self.BILLING_PRODUCT}"}); return
        state = self._billing_state(body)
        if state is False:
            return  # error already sent (hailscan starter without a state)
        try:
            _, rows = provision._req(
                "GET",
                f"/rest/v1/core_entitlements?org_id=eq.{org_id}"
                f"&product=eq.{self.BILLING_PRODUCT}"
                "&select=status,stripe_subscription_id")
        except provision.ProvisionError as e:
            self._send_json(502, {"error": str(e)}); return
        row = rows[0] if rows else {}
        if row.get("stripe_subscription_id") and \
                row.get("status") in ("active", "trialing", "past_due"):
            self._send_json(409, {
                "error": "already_subscribed",
                "message": "This organization already has a subscription. "
                           "Manage it from the billing portal instead.",
            }); return
        origin = self._billing_origin()
        ret = f"{origin}{self.BILLING_RETURN_PATH}"
        try:
            customer = billing.get_or_create_customer(
                self.BILLING_PRODUCT, org_id, email=caller.email)
            url = billing.create_checkout_session(
                self.BILLING_PRODUCT, org_id, customer, plan, interval,
                success_url=f"{ret}?checkout=success",
                cancel_url=f"{ret}?checkout=canceled",
                state=state or None)
        except (billing.BillingError, provision.ProvisionError) as e:
            self._send_json(self._billing_err_status(e), {"error": str(e)}); return
        self._send_json(200, {"url": url})

    def _billing_state(self, body):
        """Product-specific checkout extras. Fieldcam/Codes&More: none.
        (HailScan's copy requires a state for the Starter plan.)"""
        return None

    def handle_billing_portal(self) -> None:
        """POST /api/billing/portal → {url} for Stripe's customer portal."""
        if not billing.configured(self.BILLING_PRODUCT):
            self._send_json(503, {"error": "billing not configured"}); return
        caller, org_id = self._billing_org()
        if caller is None:
            return
        try:
            acct = billing.account_id(self.BILLING_PRODUCT)
            _, rows = provision._req(
                "GET",
                f"/rest/v1/core_billing_customers?org_id=eq.{org_id}"
                f"&stripe_account=eq.{acct}&select=stripe_customer_id")
        except (billing.BillingError, provision.ProvisionError) as e:
            self._send_json(self._billing_err_status(e), {"error": str(e)}); return
        if not rows:
            self._send_json(404, {
                "error": "no_customer",
                "message": "No billing profile yet — subscribe first.",
            }); return
        try:
            url = billing.create_portal_session(
                self.BILLING_PRODUCT, rows[0]["stripe_customer_id"],
                return_url=self._billing_origin() + self.BILLING_RETURN_PATH)
        except billing.BillingError as e:
            self._send_json(self._billing_err_status(e), {"error": str(e)}); return
        self._send_json(200, {"url": url})

    def do_GET(self):  # noqa: N802
        u = urlparse(self.path); path = u.path; params = parse_qs(u.query)
        if path in ("/", "/landing"):
            # __CM_COVERAGE_STATS__: server-rendered noscript stats so JS-off
            # visitors get real totals, never a fake in-flight claim
            self._send_html(200, LANDING.read_text().replace(
                "__CM_COVERAGE_STATS__", _coverage_stats_sentence())); return
        if path == "/static/us-states.svg":
            try:
                body = (DASHBOARD / "us-states.svg").read_bytes()
            except OSError:
                self._send_json(404, {"error": "not found"}); return
            self.send_response(200)
            self.send_header("Content-Type", "image/svg+xml")
            self.send_header("Cache-Control", "public, max-age=86400")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers(); self.wfile.write(body); return
        if path == "/signup":
            config = {"supabaseUrl": SUPABASE_URL, "supabaseAnonKey": SUPABASE_ANON_KEY}
            self._send_html(200, SIGNUP.read_text().replace(
                "__CODESANDMORE_CONFIG__", json.dumps(config))); return
        if path in ("/app", "/app/", "/dashboard"):
            self._send_html(200, render_shell()); return
        if path in ("/signin", "/login"):
            self._send_html(200, SIGNIN.read_text()); return
        if path == "/reset":
            # Password-recovery landing page: GoTrue redirects the emailed link
            # here with tokens in the URL fragment. Same config injection as
            # /signup (needs the anon key for PUT /auth/v1/user).
            config = {"supabaseUrl": SUPABASE_URL, "supabaseAnonKey": SUPABASE_ANON_KEY}
            self._send_html(200, RESET.read_text().replace(
                "__CODESANDMORE_CONFIG__", json.dumps(config))); return
        if path == "/terms":
            self._send_html(200, TERMS.read_text()); return
        if path == "/privacy":
            self._send_html(200, PRIVACY.read_text()); return
        if path == "/healthz":
            self._send_json(200, {"ok": True, "service": "codesandmore"}); return
        if path == "/api/public/coverage":
            self.handle_public_coverage(); return
        if path == "/api/cm/trades":
            # Static trade catalog for the report-create picker — no auth (it
            # exposes only id/label/discipline, never internal fields).
            self._cc = None; self.user_claims = None
            self._send_json(200, {"trades": [
                {"id": t["id"], "label": t["label"], "discipline": t["discipline"]}
                for t in trades.TRADES]},
                cache_control="public, max-age=300"); return
        if path.startswith("/api/") and not self._authenticate():
            return
        if path == "/api/me":
            self._send_json(200, self._caller().to_me()); return
        if path == "/api/products":
            self.handle_products_get(); return
        if path == "/api/billing/config":
            self.handle_billing_config(); return
        if not self._gate(path):
            return
        try:
            if path == "/api/cm/adoptions":
                rows = cmdata.list_state_adoptions(self._bearer())
                self._send_json(200, {
                    "as_of": max((r.get("verified_at") for r in rows if r.get("verified_at")),
                                 default=None),
                    "rows": rows,
                }); return
            if path == "/api/cm/boundary":
                self.handle_boundary(params); return
            if path == "/api/cm/org":
                self.handle_org_get(); return
            if path == "/api/cm/reports":
                self._send_json(200, cmdata.list_reports(self._bearer(), caller=self._caller())); return
            m = re.match(r"^/api/cm/reports/([0-9a-fA-F-]{8,})$", path)
            if m:
                self._send_json(200, cmdata.get_report(m.group(1), self._bearer(), caller=self._caller())); return
            if path == "/api/cm-report/status":
                jid = (params.get("job_id") or [None])[0]
                with _report_jobs_lock:
                    j = _report_jobs.get(jid)
                self._send_json(200 if j else 404, j or {"error": "unknown job"}); return
            if path == "/api/cm-report/file":
                jid = (params.get("job_id") or [None])[0]
                with _report_jobs_lock:
                    j = _report_jobs.get(jid)
                if j and j.get("status") == "ready":
                    self._send_file(CM_PDF_DIR / f"{jid}.pdf", j.get("filename") or f"ol-report-{jid}.pdf", "application/pdf"); return
                # In-memory job gone (restart / TTL eviction) and/or the cached
                # PDF was pruned or lost (e.g. the box was rebuilt). Re-authorize
                # via the org-scoped cm_reports row that recorded this job_id,
                # then serve the cached file if present — else REGENERATE it from
                # the durable report data and re-cache. A report's PDF is thus
                # available at all times, independent of any one machine's disk.
                if jid and _REPORT_ID_RE.match(jid):
                    rows = cmdata._req("GET", "cm_reports",
                                       {"select": "id", "job_id": f"eq.{jid}", "limit": "1",
                                        **cmdata._org_params(self._caller())},
                                       token=self._bearer()) or []
                    if rows:
                        pdf_path = CM_PDF_DIR / f"{jid}.pdf"
                        if not pdf_path.exists():
                            import cmreport
                            CM_PDF_DIR.mkdir(parents=True, exist_ok=True)
                            cmreport.render_cm_report(rows[0]["id"], pdf_path,
                                                      token=self._bearer(), caller=self._caller())
                        self._send_file(pdf_path, f"ol-report-{jid}.pdf", "application/pdf"); return
                self._send_json(404, {"error": "not ready"}); return
            self._send_json(404, {"error": "not found"})
        except cmdata.CMNotConfigured as e:
            self._send_json(503, {"error": str(e)})
        except cmdata.CMError as e:
            self._send_json(e.status, {"error": str(e)})

    def handle_boundary(self, params: dict):
        """GET /api/cm/boundary?county_fips=&place_fips=&lat=&lon= — authed +
        entitled (routed behind _authenticate/_gate). Simplified jurisdiction
        boundary normalized to a 1000x1000 viewBox; pin included when lat/lon
        are given. ANY failure ⇒ 404 {"error":"boundary unavailable"} — the
        client treats it as silent absence, never a blocker."""
        place = ((params.get("place_fips") or [""])[0] or "").strip()
        county = ((params.get("county_fips") or [""])[0] or "").strip()
        lat = _float_or_none((params.get("lat") or [None])[0])
        # 'lng' accepted as an alias for 'lon' (common caller spelling)
        lon = _float_or_none((params.get("lon") or params.get("lng") or [None])[0])
        fips = (place if place.isdigit() and len(place) == 7 else
                county if county.isdigit() and len(county) == 5 else None)
        if not fips and (lat is not None or lon is not None):
            # lat/lon alone can't select a boundary — name the required params
            # instead of a misleading 404
            self._send_json(400, {"error": "county_fips (5 digits) or place_fips "
                                           "(7 digits) is required; lat/lon only "
                                           "position the pin"}); return
        fetched = _fetch_boundary_cached(fips) if fips else None
        if not fetched:
            self._send_json(404, {"error": "boundary unavailable"}); return
        ring, pin = _normalize_ring(fetched["ring"], lat, lon)
        payload = {
            "geoid": fetched["geoid"],
            "name": fetched.get("name"),
            "level": fetched["level"],
            "ring": ring,
            "points": len(ring),
            "viewbox": 1000,
            "source": "US Census TIGERweb",
        }
        if pin:
            payload["pin"] = pin
        self._send_json(200, payload)

    # --- public surface (auth-exempt; runs BEFORE _authenticate) -------------
    def handle_public_coverage(self):
        """GET /api/public/coverage — UNAUTHENTICATED, rate-limited, 5-min
        cached. Gating-safe fields ONLY (see _build_coverage / _teaser_payload):
        no edition/code strings, no sources, no amendment notes — ever."""
        self._cc = None; self.user_claims = None
        if not _coverage_limiter.allow(self._client_ip()):
            self._send_json(429, {"error": "coverage lookup limit reached — "
                                           "try again in an hour"}); return
        now = time.time()
        with _coverage_lock:
            payload = _coverage_cache["payload"]
            fresh = payload is not None and now - _coverage_cache["at"] < _COVERAGE_TTL
        if not fresh:
            try:
                payload = _build_coverage()
                with _coverage_lock:
                    _coverage_cache.update(at=now, payload=payload)
            except (cmdata.CMNotConfigured, cmdata.CMError) as e:
                print(f"  public coverage refresh failed: {e}", flush=True)
                if payload is None:  # no last-good cache to fall back on
                    self._send_json(503, {"error": "coverage unavailable"}); return
        self._send_json(200, payload, cache_control="public, max-age=300")

    def handle_signup(self):
        """POST /api/signup — self-serve trial signup. NO auth (it creates the
        account). Creates GoTrue user + org + TRIAL codesandmore entitlement via
        the vendored core provision module."""
        self._cc = None; self.user_claims = None
        try:
            body = self._json_body()
        except (ValueError, json.JSONDecodeError) as e:
            self._send_json(400, {"error": f"bad json: {e}"}); return
        email = (body.get("email") or "").strip().lower()
        password = body.get("password") or ""
        org_name = (body.get("org_name") or "").strip() or None
        name = (body.get("name") or "").strip() or None
        role = (body.get("role") or "").strip() or None
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
            self._send_json(400, {"error": "valid email required"}); return
        if len(password) < 8:
            self._send_json(400, {"error": "password must be at least 8 characters"}); return
        # rate-limit AFTER validation so bad input doesn't burn a slot; signup
        # provisions real GoTrue users + orgs, so it gets a stricter cap
        if not _signup_limiter.allow(self._client_ip()):
            self._send_json(429, {"error": "too many signup attempts from this "
                                           "address — try again in an hour"}); return
        if not provision.configured():
            self._send_json(503, {"error": "signup unavailable in local dev",
                "message": "Self-serve signup is not available on this server "
                           "(missing SUPABASE_SERVICE_ROLE_KEY). In local dev, sign in "
                           "with an existing account at /app."}); return
        meta = {k: v for k, v in (("full_name", name), ("role", role)) if v}
        try:
            result = provision.signup(email, password, "codesandmore", org_name=org_name,
                                      user_metadata=meta or None)
        except provision.ProvisionError as e:
            msg = str(e)
            status = 409 if "already" in msg.lower() or "exists" in msg.lower() else 502
            self._send_json(status, {"error": msg}); return
        self._send_json(200, {"ok": True,
                              **{k: v for k, v in result.items() if k != "password"}})

    def handle_resolve(self):
        """POST /api/cm/resolve — works UNAUTHENTICATED for the landing teaser
        (rate-limited, trimmed payload). Authenticated callers keep the full
        payload behind the usual entitlement gate."""
        self._cc = None; self.user_claims = None
        token = self._bearer()
        # Dev mode (explicit CODESANDMORE_REQUIRE_AUTH=0 opt-out): the /app
        # dashboard has no session, so every caller is the app — full payload,
        # no public cap. Auth defaults ON; main() prints a warning in dev mode.
        authed = not REQUIRE_AUTH
        if REQUIRE_AUTH and token:
            try:
                self.user_claims = verify_supabase_jwt(
                    token, secret=SUPABASE_JWT_SECRET or None,
                    jwks_url=SUPABASE_JWKS_URL or None)
                authed = True
            except AuthError as e:
                # a presented-but-invalid token gets 401 so the app's
                # refresh/re-login recovery triggers; the public teaser path is
                # reserved for requests with NO Authorization header at all
                self._send_json(401, {"error": f"invalid token: {e}"}); return
        if authed and not self._gate("/api/cm/resolve"):
            return
        try:
            body = self._json_body()
        except (ValueError, json.JSONDecodeError) as e:
            self._send_json(400, {"error": f"bad json: {e}"}); return
        # validate BEFORE the rate limiter so a 400 never burns a public slot
        if not ((body.get("address") or "").strip() or
                (body.get("zip") or body.get("zip5") or "").strip()):
            self._send_json(400, {"error": "address or zip is required"}); return
        if not authed and not _resolve_limiter.allow(self._client_ip()):
            self._send_json(429, {"error": "lookup limit reached — start a free "
                                           "trial for unlimited lookups"}); return
        try:
            payload = _resolve_lookup(body, token if authed else None)
            self._send_json(200, payload if authed else _teaser_payload(payload))
        except cmdata.CMNotConfigured as e:
            self._send_json(503, {"error": str(e)})
        except cmdata.CMError as e:
            self._send_json(e.status, {"error": str(e)})

    def do_POST(self):  # noqa: N802
        u = urlparse(self.path); path = u.path
        if path == "/api/signup":
            self.handle_signup(); return
        if path == "/api/cm/resolve":
            self.handle_resolve(); return
        if path.startswith("/api/") and not self._authenticate():
            return
        if path == "/api/products/add":
            self.handle_products_add(); return
        if path == "/api/billing/checkout":
            self.handle_billing_checkout(); return
        if path == "/api/billing/portal":
            self.handle_billing_portal(); return
        if not self._gate(path):
            return
        try:
            body = self._json_body()
            if path == "/api/cm/reports":
                self._send_json(200, _create_report(body, self._bearer(), caller=self._caller())); return
            if path == "/api/cm/requirements":
                self._send_json(200, cmdata.add_requirement(body, self._bearer(), caller=self._caller())); return
            if path == "/api/cm-report/start":
                report_id = body.get("report_id")
                if not report_id or not _REPORT_ID_RE.match(str(report_id)):
                    self._send_json(400, {"error": "valid report_id required"}); return
                caller = self._caller()
                # org-scoped fetch 404s here if the report isn't the caller's —
                # closes the forged-report_id window before the unscoped daemon runs
                cmdata._parent_report(report_id, self._bearer(), caller)
                job_id = uuid.uuid4().hex[:12]
                with _report_jobs_lock:
                    _prune_report_jobs()
                    _report_jobs[job_id] = {"id": job_id, "status": "queued", "progress": 0.0,
                                            "stage": "queued", "created_at": time.time()}
                threading.Thread(target=_run_report_job, args=(job_id, report_id, self._bearer(), caller),
                                 name=f"cm-report-{job_id}", daemon=True).start()
                self._send_json(200, {"job_id": job_id, "status": "queued"}); return
            self._send_json(404, {"error": "not found"})
        except cmdata.CMNotConfigured as e:
            self._send_json(503, {"error": str(e)})
        except cmdata.CMError as e:
            self._send_json(e.status, {"error": str(e)})
        except (ValueError, json.JSONDecodeError) as e:
            self._send_json(400, {"error": f"bad json: {e}"})

    def do_PATCH(self):  # noqa: N802
        u = urlparse(self.path); path = u.path
        if path.startswith("/api/") and not self._authenticate():
            return
        if not self._gate(path):
            return
        try:
            body = self._json_body()
            m = re.match(r"^/api/cm/reports/([0-9a-fA-F-]{8,})$", path)
            if m:
                self._send_json(200, cmdata.update_report(m.group(1), body, self._bearer(),
                                                          caller=self._caller())); return
            m = re.match(r"^/api/cm/requirements/([0-9a-fA-F-]{8,})$", path)
            if m:
                self._send_json(200, cmdata.update_requirement(m.group(1), body, self._bearer(),
                                                               caller=self._caller())); return
            self._send_json(404, {"error": "not found"})
        except cmdata.CMNotConfigured as e:
            self._send_json(503, {"error": str(e)})
        except cmdata.CMError as e:
            self._send_json(e.status, {"error": str(e)})
        except (ValueError, json.JSONDecodeError) as e:
            self._send_json(400, {"error": f"bad json: {e}"})

    def do_DELETE(self):  # noqa: N802
        u = urlparse(self.path); path = u.path
        if path.startswith("/api/") and not self._authenticate():
            return
        if not self._gate(path):
            return
        try:
            m = re.match(r"^/api/cm/reports/([0-9a-fA-F-]{8,})$", path)
            if m:
                cmdata.delete_report(m.group(1), self._bearer(), caller=self._caller())
                self._send_json(200, {"ok": True}); return
            m = re.match(r"^/api/cm/requirements/([0-9a-fA-F-]{8,})$", path)
            if m:
                cmdata.delete_requirement(m.group(1), self._bearer(), caller=self._caller())
                self._send_json(200, {"ok": True}); return
            self._send_json(404, {"error": "not found"})
        except cmdata.CMNotConfigured as e:
            self._send_json(503, {"error": str(e)})
        except cmdata.CMError as e:
            self._send_json(e.status, {"error": str(e)})


def main() -> int:
    parser = argparse.ArgumentParser(description="Run the Codes&More server.")
    parser.add_argument("--port", type=int, default=8780)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--no-open", action="store_true")
    args = parser.parse_args()
    server = ThreadingHTTPServer((args.host, args.port), Handler)
    print(f"  Codes&More serving at http://localhost:{args.port}/app")
    print(f"  auth={'on' if REQUIRE_AUTH else 'off'}  entitlement={'on' if ENFORCE_ENTITLEMENT else 'off'}"
          f"  service_key={'set' if cmdata.SERVICE_KEY else 'MISSING'}")
    if not REQUIRE_AUTH:
        print("  *** WARNING: auth is OFF — /api/cm/resolve serves the FULL payload\n"
              "  *** (adopted code editions, local adoptions) to UNAUTHENTICATED callers\n"
              "  *** with no rate limit. Local dev only; never deploy like this.\n"
              "  *** Set CODESANDMORE_REQUIRE_AUTH=1 (the default) for any reachable host.",
              flush=True)
    if not args.no_open:
        threading.Timer(0.5, lambda: webbrowser.open(f"http://localhost:{args.port}/app")).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  shutting down"); server.shutdown()
    return 0


if __name__ == "__main__" and os.environ.get("CM_SELFTEST") == "1":
    import trades as trademod
    plan = _trade_build_plan(
        ["roofing", "electrical"],
        building_cycle=("IRC", "2021"),
        resolve_discipline=lambda disc: {"code": "NEC", "edition": "2017", "ahj_confirm": False}
            if disc == "electrical" else {"code": None, "edition": None, "ahj_confirm": True},
    )
    assert plan["roofing"] == {"code": "IRC", "edition": "2021", "ahj_confirm": False}, plan
    assert plan["electrical"] == {"code": "NEC", "edition": "2017", "ahj_confirm": False}, plan
    plan2 = _trade_build_plan(["roofing"], building_cycle=(None, None),
                              resolve_discipline=lambda d: {"code": None, "edition": None, "ahj_confirm": True})
    assert plan2["roofing"]["ahj_confirm"] is True
    print("serve _trade_build_plan OK")
    sys.exit(0)


if __name__ == "__main__":
    sys.exit(main())
