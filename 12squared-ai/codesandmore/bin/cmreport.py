#!/usr/bin/env python3
"""Codes&More — Ordinance-or-Law report PDF.

Reuses pdf.py's Playwright renderer (static-server + __PDF_READY__ gate) with a
dedicated template (cm_report_template.html). Assembles the report + its
requirement line items into the print data and renders. Requires Chromium/
Playwright in the runtime (same as the other products' PDF paths).
"""
from __future__ import annotations

import asyncio
import re
import sys
import tempfile
import traceback
from datetime import datetime, timezone
from pathlib import Path

import cmdata
import cmlibrary
import hazards as hazardmod
import jurisdiction
import minimap
import trades as trademod

TEMPLATE_PATH = Path(__file__).resolve().parent / "cm_report_template.html"


def _resolve_site(report: dict) -> dict | None:
    """Best-effort jurisdiction stack for the report's address (lat/lon,
    county/place FIPS). Resolved once and shared by the hazard profile and the
    cover mini-map. Never raises — a PDF must still render when geocoding is
    down."""
    try:
        address = ", ".join(filter(None, [
            report.get("address"), report.get("city"), report.get("state")]))
        if not address:
            return None
        return jurisdiction.resolve(address)
    except Exception as e:  # noqa: BLE001 — site resolution is best-effort
        print(f"  cmreport: site resolution failed: {e}", file=sys.stderr, flush=True)
        traceback.print_exc()
        return None


def _site_hazards(report: dict, stack: dict | None) -> dict | None:
    """Best-effort site hazard profile from a resolved stack. Never raises —
    a PDF must still render when the hazard services are down."""
    if not stack:
        return None
    try:
        ed = re.search(r"\b(20\d{2})\b", report.get("code_cycle") or "")
        return hazardmod.hazards_for(
            stack.get("lat"), stack.get("lon"), stack.get("county_fips"),
            code_edition=ed.group(1) if ed else None)
    except Exception as e:  # noqa: BLE001 — hazard overlay is best-effort
        print(f"  cmreport: hazard lookup failed: {e}", file=sys.stderr, flush=True)
        traceback.print_exc()
        return None


def _cover_minimap(stack: dict | None) -> tuple[str | None, str | None]:
    """(svg, boundary_name) for the cover 'Site & Jurisdiction' block.
    Place polygon when the address resolved to an incorporated place, county
    polygon otherwise. (None, None) on any failure — the map is cover art and
    must never fail, delay-block, or watermark the report."""
    if not stack:
        return None, None
    try:
        fips = stack.get("place_fips") or stack.get("county_fips")
        svg = minimap.boundary_svg(
            fips, stack.get("state_abbr"), stack.get("lat"), stack.get("lon"))
        if not svg:
            return None, None
        name = (stack.get("place_name") if stack.get("place_fips")
                else stack.get("county_name")) or stack.get("county_name")
        return svg, name
    except Exception as e:  # noqa: BLE001 — belt and suspenders
        print(f"  cmreport: minimap unavailable: {e}", file=sys.stderr, flush=True)
        return None, None


def _group_by_trade(reqs: list[dict]) -> list[dict]:
    """Requirements grouped into per-trade sections, ordered by trade label.
    Rows with no trade fall under 'Other'."""
    by: dict[str, list[dict]] = {}
    for r in reqs:
        by.setdefault(r.get("trade") or "other", []).append(r)

    def label(tid: str) -> str:
        try:
            return trademod.trade(tid)["label"]
        except KeyError:
            return "Other"

    return [{"trade": tid, "label": label(tid),
             "code_source": rows[0].get("code_source") if rows else None,
             "requirements": rows}
            for tid, rows in sorted(by.items(), key=lambda kv: label(kv[0]))]


def _citations(reqs: list[dict]) -> list[dict]:
    """De-duplicated, ordered citation records for the Sources page. Only rows
    with a section AND source_url appear (render invariant)."""
    seen: set = set()
    out: list[dict] = []
    for r in reqs:
        section, url = r.get("section"), r.get("source_url")
        if not (section and url):
            continue
        key = (r.get("code_source"), section, url)
        if key in seen:
            continue
        seen.add(key)
        out.append({"trade": r.get("trade"), "code_source": r.get("code_source"),
                    "section": section, "source_url": url,
                    "edition": r.get("edition"), "verified_at": r.get("verified_at"),
                    "confidence": r.get("confidence")})
    out.sort(key=lambda c: (c.get("code_source") or "", c.get("section") or ""))
    return out


def render_cm_report(report_id: str, out_path: Path, token: str | None = None, progress=None,
                     caller=None) -> dict:
    import pdf  # lazy: pulls Playwright

    def emit(stage: str, frac: float) -> None:
        if progress:
            try:
                progress(stage, frac)
            except Exception:
                pass

    emit("assembling data", 0.1)
    report = cmdata.get_report(report_id, token=token, caller=caller)
    reqs = report.get("requirements", [])

    # Adoption reference (best-effort: may be unavailable without a service key).
    # Failures are logged + surfaced in the returned metadata so degraded reports
    # (no confidence badge / verified date) never ship invisibly.
    adoption = None
    adoption_lookup_error = None
    try:
        adoption = cmdata.get_state_adoption(report.get("state"), token=token)
    except Exception as e:
        adoption_lookup_error = str(e)
        print(f"  cmreport: adoption lookup failed for state={report.get('state')!r}: {e}",
              file=sys.stderr, flush=True)
        traceback.print_exc()
        emit(f"adoption lookup failed ({e}) — rendering without adoption data", 0.15)
    generated_at = datetime.now(timezone.utc).isoformat()
    verified_at = (adoption or {}).get("verified_at")
    # verified_at passes through as-is: when the adoption lookup failed, the
    # disclaimer states the verification date is unavailable rather than
    # printing the render date as if it were a data date
    disclaimers = cmlibrary.render_disclaimers(verified_at, report.get("jurisdiction"))

    emit("resolving site hazards", 0.2)
    stack = _resolve_site(report)
    site_hazards = _site_hazards(report, stack)
    emit("fetching map", 0.3)
    minimap_svg, minimap_name = _cover_minimap(stack)
    if site_hazards:
        # Resolve conditional-applicability notes on affected rows (pure
        # overlay; rows whose hazard value is unknown stay as-is). The overlay
        # must never break the PDF render — fall back to unannotated rows.
        try:
            reqs = cmlibrary.apply_hazard_conditions(reqs, site_hazards)
        except Exception as e:  # noqa: BLE001 — overlay is best-effort
            print(f"  cmreport: hazard condition overlay failed: {e}",
                  file=sys.stderr, flush=True)
            traceback.print_exc()

    data = {
        "report_title": report.get("title") or "Ordinance-or-Law Requirements",
        "report_id": str(report_id)[:8],
        "generated_at": generated_at,
        # Title-block DATE cell (drawing-sheet cover): the report's created_at
        # when present, labeled as such; the template falls back to the render
        # date (generated_at) and labels it "rendered" instead.
        "created_at": report.get("created_at"),
        "verified_at": verified_at,
        "adoption": adoption,
        "disclaimers": disclaimers,
        "address": report.get("address"),
        "city": report.get("city"),
        "state": report.get("state"),
        "jurisdiction": report.get("jurisdiction"),
        "code_cycle": report.get("code_cycle"),
        "summary": report.get("summary"),
        "source": report.get("source"),
        "hazards": site_hazards,
        # Cover mini-map: server-generated boundary SVG (or null — the
        # template's slot collapses and the cover renders exactly as before).
        "minimap_svg": minimap_svg,
        "minimap_name": minimap_name,
        "requirements": [{
            "category": r.get("category"),
            "code_source": r.get("code_source"),
            "section": r.get("section"),
            "requirement": r.get("requirement"),
            "trigger": r.get("trigger"),
            "applies": r.get("applies"),
            "cost_estimate_cents": r.get("cost_estimate_cents"),
            "notes": r.get("notes"),
        } for r in reqs],
        "trade_groups": _group_by_trade(reqs),
        "citations": _citations(reqs),
        "trades": report.get("trades") or [],
    }

    emit("loading template", 0.4)
    template_html = TEMPLATE_PATH.read_text()
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    emit("rendering pdf", 0.55)
    with tempfile.TemporaryDirectory(prefix="cmrep_") as tmp:
        asyncio.run(pdf._render_pdf_async(
            template_html, data, Path(tmp), out_path,
            progress=lambda s, f: emit(s, 0.55 + 0.4 * f),
        ))

    pages = 0
    try:
        pages = pdf._count_pdf_pages(out_path)
    except Exception:
        pass
    safe = "".join(c if c.isalnum() or c in "-_ " else "-"
                   for c in (report.get("address") or "ol-report"))[:40].strip() or "ol-report"
    emit("done", 1.0)
    return {"filename": f"ol-report_{safe}.pdf", "pages": pages,
            "property_id": report.get("property_id"), "report": report,
            "adoption_lookup_error": adoption_lookup_error}


if __name__ == "__main__":
    reqs = [
        {"trade": "roofing", "code_source": "IRC 2021", "section": "R905.1",
         "requirement": "Underlayment: ...", "source_url": "https://a", "edition": "2021",
         "confidence": "high", "verified_at": "2026-06-09"},
        {"trade": "exterior", "code_source": "IRC 2021", "section": "R703.1",
         "requirement": "Cladding: ...", "source_url": "https://b", "edition": "2021",
         "confidence": "medium", "verified_at": "2026-06-09"},
    ]
    groups = _group_by_trade(reqs)
    assert [g["trade"] for g in groups] == ["exterior", "roofing"], groups  # sorted by label
    cites = _citations(reqs)
    assert len(cites) == 2 and all(c["source_url"] for c in cites)
    assert cites[0]["section"] and cites[0]["code_source"] and cites[0]["verified_at"]
    # de-dup: identical (code_source, section, url) collapses
    dup = _citations(reqs + [dict(reqs[0])])
    assert len(dup) == 2, dup
    # rows lacking section or source_url are excluded from citations
    assert _citations([{"trade": "x", "code_source": "IRC 2021", "section": "", "source_url": "u"}]) == []
    print(f"cmreport grouping OK — {len(groups)} trade groups, {len(cites)} citations")
