#!/usr/bin/env python3
"""
Local HTTP server for the hailscan dashboard.

Endpoints:
  GET  /                   → dashboard shell
  GET  /api/scan?date=...  → MRMS swaths for a date (or latest NOAA feed if omitted)
  GET  /api/topdays        → SPC-ranked top hail days across cached history
  GET  /api/topreports     → individual top reports by size
  GET  /api/nearby?lat=&lon=&radius= → dates with hail near a point
  POST /api/batch          → geocode + nearby for a list of addresses in one call
  POST /api/video/start    → render an MP4 timelapse of every hail day at a point
  GET  /api/video/status?job_id= → progress of a render job
  GET  /api/video/file?job_id=   → download the finished MP4

On startup, phase 1 preloads ~730 days of SPC reports into memory (so the
dashboard is interactive in seconds). A background thread then extends the
window to ~10 years so requests with `years=5` or higher hit memory rather
than the network. `_ensure_history(years)` synchronously fills any gap if
a request arrives before the background extend has caught up. Recent days
are re-fetched every 15 minutes.
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
import webbrowser

import requests
from datetime import date, datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

sys.path.insert(0, str(Path(__file__).resolve().parent))
from scan import TEMPLATE, mesh_at, run_scan  # noqa: E402
import spc  # noqa: E402
from auth import verify_supabase_jwt, AuthError  # noqa: E402
import field_routes  # noqa: E402  (Field Documentation routes + media worker)
import uuid

# --- Auth config -------------------------------------------------------------
# When HAILSCAN_REQUIRE_AUTH=1, every /api/* request must carry a valid Supabase
# access token: `Authorization: Bearer <jwt>`. Default OFF, so the existing
# localhost dashboard keeps working unchanged. Turn it ON whenever the server is
# exposed beyond localhost (e.g. --host 0.0.0.0 for device testing, or a public
# deployment).
#
# This Supabase project signs user tokens with ES256 (asymmetric); the server
# verifies them against the project's JWKS. SUPABASE_JWT_SECRET is the optional
# HS256 fallback for projects still using the legacy shared secret.
# Defaults to the shared 12² Supabase project (same default as codesandmore/hub
# serve.py, and the same project as the anon key below) so HAILSCAN_REQUIRE_AUTH=1
# works on its own instead of silently no-oping when SUPABASE_URL is unset.
# Override via env.
SUPABASE_URL = os.environ.get(
    "SUPABASE_URL", "https://eitnccqaysidqvgudeeb.supabase.co"
).rstrip("/")
SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", "")
# Publishable anon key — safe to expose to the browser; the dashboard uses it for
# Supabase GoTrue sign-in (same project as the iOS app, so web + iPhone share
# auth and CRM data). Defaults to the HailScan project's anon key; override via env.
SUPABASE_ANON_KEY = os.environ.get(
    "SUPABASE_ANON_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpdG5jY3FheXNpZHF2Z3VkZWViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0NjAzODYsImV4cCI6MjA5NjAzNjM4Nn0.i9-7j0USLioV_p-ZKCfWTHS9SOxv54R1Jqg0lDTH94g",
)
SUPABASE_JWKS_URL = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json" if SUPABASE_URL else ""
REQUIRE_AUTH = (
    os.environ.get("HAILSCAN_REQUIRE_AUTH", "0") == "1"
    and bool(SUPABASE_JWKS_URL or SUPABASE_JWT_SECRET)
)
# Tiered-subscription coverage enforcement. When on, address searches are limited
# to the states the signed-in user's subscription covers (nationwide = no limit).
# Defaults to following auth: on when auth is required, off on localhost dev runs.
# Override explicitly with HAILSCAN_ENFORCE_SUBSCRIPTION=1/0.
ENFORCE_SUBSCRIPTION = (
    os.environ.get("HAILSCAN_ENFORCE_SUBSCRIPTION", "1" if REQUIRE_AUTH else "0") == "1"
)

# Lazy import — matplotlib is heavy. We only need it when a video is requested.
_video_module = None
def _video():
    global _video_module
    if _video_module is None:
        import video as _v  # noqa: E402
        _video_module = _v
    return _video_module

# Lazy import — Playwright spin-up adds startup cost; only load on demand.
_pdf_module = None
def _pdf():
    global _pdf_module
    if _pdf_module is None:
        import pdf as _p  # noqa: E402
        _pdf_module = _p
    return _pdf_module

DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

SPC_HISTORY_DAYS = 3650        # ~10 years (max window — preloaded in phases)
SPC_FAST_PRELOAD_DAYS = 730    # ~2 years — phase 1 preload before serving
SPC_REFRESH_INTERVAL = 900     # 15 min

_scan_lock = threading.Lock()

# Last-loaded MRMS grid, kept in memory so /api/mesh can look up cell values
# without re-decoding the grib on every click. ~100 MB for a full CONUS grid.
_grid_lock = threading.Lock()
_grid_state: dict = {"product": None, "arr": None, "lats": None, "lons": None}

# In-process LRU-ish cache for geocode results (same city typed many times).
_geocode_lock = threading.Lock()
_geocode_cache: dict = {}
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
# Nominatim usage policy requires an identifying User-Agent.
NOMINATIM_UA = "hailscan/1.0 (local tool; contact: local)"
# Nominatim usage policy: max 1 request/sec. Serialize live calls behind this lock
# so /api/batch can blast a list without tripping rate limits.
_nominatim_call_lock = threading.Lock()
_nominatim_last_call = 0.0
NOMINATIM_MIN_INTERVAL = 1.05  # seconds

# US Census Bureau geocoder — purpose-built for US street addresses, free, no
# rate limit beyond reasonable. Used as the PRIMARY geocoder for US queries
# because Nominatim silently falls back to nearby POIs (e.g. "Pizza Hut") when
# OSM doesn't have a specific building, producing dangerously wrong matches.
CENSUS_URL = "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress"


def _normalize_geocode(raw: list) -> list[dict]:
    out = []
    for item in raw:
        addr = item.get("address", {}) or {}
        place = (
            item.get("name")
            or addr.get("city")
            or addr.get("town")
            or addr.get("village")
            or addr.get("hamlet")
            or (item.get("display_name", "").split(",")[0] if item.get("display_name") else "")
        )
        state = addr.get("state")
        county = addr.get("county")
        out.append({
            "name": item.get("display_name", place),
            "short": ", ".join([x for x in [place, state] if x]) or place,
            "place": place,
            "state": state,
            "county": county,
            "lat": float(item["lat"]),
            "lon": float(item["lon"]),
            "type": item.get("type"),
            "class": item.get("class"),
        })
    return out


def _census_geocode(q: str) -> list[dict]:
    """US Census geocoder — accurate for US street addresses, returns [] if no
    match (e.g. for cities/ZIPs/non-US queries)."""
    try:
        r = requests.get(
            CENSUS_URL,
            params={"address": q, "benchmark": "Public_AR_Current", "format": "json"},
            headers={"User-Agent": NOMINATIM_UA},
            timeout=12,
        )
        r.raise_for_status()
        data = r.json()
    except Exception:
        return []
    matches = (data.get("result") or {}).get("addressMatches") or []
    out = []
    for m in matches:
        coords = m.get("coordinates") or {}
        comp = m.get("addressComponents") or {}
        lat = coords.get("y")
        lon = coords.get("x")
        if lat is None or lon is None:
            continue
        city = comp.get("city") or ""
        state = comp.get("state") or ""
        matched = m.get("matchedAddress") or q
        out.append({
            "name": matched,
            "short": matched,
            "place": city,
            "state": state,
            "county": "",
            "lat": float(lat),
            "lon": float(lon),
            "type": "house",
            "class": "building",
        })
    return out


def _nominatim_geocode(q: str, limit: int) -> list[dict]:
    """Nominatim fallback — used for non-US queries, cities, ZIPs, or anything
    Census can't resolve. Rate-limited per Nominatim's usage policy."""
    global _nominatim_last_call
    with _nominatim_call_lock:
        wait = NOMINATIM_MIN_INTERVAL - (time.time() - _nominatim_last_call)
        if wait > 0:
            time.sleep(wait)
        r = requests.get(
            NOMINATIM_URL,
            params={"q": q, "format": "json", "limit": limit, "countrycodes": "us", "addressdetails": 1},
            headers={"User-Agent": NOMINATIM_UA, "Accept-Language": "en"},
            timeout=15,
        )
        _nominatim_last_call = time.time()
    r.raise_for_status()
    return _normalize_geocode(r.json())


def _geocode(q: str, limit: int = 5) -> list[dict]:
    """Two-tier geocoder. Tries Census first (accurate for US street addresses),
    falls back to Nominatim for cities/ZIPs/POIs/anything Census doesn't know.
    Cached so repeat queries hit no network."""
    key = q.strip().lower()
    if not key:
        return []
    with _geocode_lock:
        cached = _geocode_cache.get(key)
    if cached is not None:
        return cached

    # Census first — it returns clean street-address matches with no POI fallback.
    results = _census_geocode(q)
    if not results:
        # Fallback: Nominatim. May return POIs or non-US; better than nothing.
        try:
            results = _nominatim_geocode(q, limit)
        except Exception:
            results = []

    with _geocode_lock:
        _geocode_cache[key] = results
        if len(_geocode_cache) > 500:
            _geocode_cache.pop(next(iter(_geocode_cache)))
    return results


# ---- Reverse geocode: point -> state (for coverage enforcement) ------------
# The Census "geographies/coordinates" service returns the state a lat/lon falls
# in. Cached by coarse coordinate so repeat lookups in an area hit no network.
CENSUS_REVERSE_URL = "https://geocoding.geo.census.gov/geocoder/geographies/coordinates"
_revgeo_cache: dict[tuple[float, float], str | None] = {}
_revgeo_lock = threading.Lock()


def _state_for_point(lat: float, lon: float) -> str | None:
    """Best-effort 2-letter USPS code for a coordinate, or None if unknown."""
    import subscriptions  # lazy: server starts fine without the sub backend
    key = (round(lat, 2), round(lon, 2))
    with _revgeo_lock:
        if key in _revgeo_cache:
            return _revgeo_cache[key]
    code: str | None = None
    try:
        r = requests.get(
            CENSUS_REVERSE_URL,
            params={
                "x": lon, "y": lat,
                "benchmark": "Public_AR_Current",
                "vintage": "Current_Current",
                "format": "json",
            },
            headers={"User-Agent": NOMINATIM_UA},
            timeout=12,
        )
        r.raise_for_status()
        states = ((r.json().get("result") or {}).get("geographies") or {}).get("States") or []
        if states:
            code = subscriptions.normalize_state(
                states[0].get("STUSAB") or states[0].get("NAME")
            )
    except Exception:
        code = None
    with _revgeo_lock:
        _revgeo_cache[key] = code
        if len(_revgeo_cache) > 2000:
            _revgeo_cache.pop(next(iter(_revgeo_cache)))
    return code


# ---- Request validation ----------------------------------------------------

def _valid_point(lat: float, lon: float) -> bool:
    """True if lat/lon are finite and within geographic bounds. Rejects NaN,
    Infinity, and out-of-range values that would otherwise produce invalid
    JSON or nonsensical distance math."""
    return (
        math.isfinite(lat) and math.isfinite(lon)
        and -90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0
    )


def _valid_radius(radius: float) -> bool:
    """True if radius is finite and within a sane mileage range (0, 100]."""
    return math.isfinite(radius) and 0.0 < radius <= 100.0


# ---- Video job state -------------------------------------------------------

VIDEO_DIR = Path(__file__).resolve().parent.parent / "data" / "videos"
# SEPARATE output dir for the CGI dramatization mode so its files never mingle
# with the compliant report videos.
VIDEO_DRAMATIZATION_DIR = (
    Path(__file__).resolve().parent.parent / "data" / "videos_dramatization"
)
_video_jobs_lock = threading.Lock()
_video_jobs: dict[str, dict] = {}
# Job dict: {id, status: queued|running|done|error, progress, stage, error,
#            label, filename, bytes, mode, started_at, finished_at}


def _video_dir_for_mode(mode: str) -> Path:
    return VIDEO_DRAMATIZATION_DIR if mode == "dramatization" else VIDEO_DIR


def _safe_filename(label: str) -> str:
    cleaned = "".join(c if c.isalnum() or c in "-_." else "_" for c in label)
    return cleaned[:60] or "hail-history"


def _run_video_job(job_id: str, lat: float, lon: float, label: str, radius_mi: float,
                   years: int = 2, mode: str = "report") -> None:
    out_dir = _video_dir_for_mode(mode)
    out_path = out_dir / f"{job_id}.mp4"
    out_path.parent.mkdir(parents=True, exist_ok=True)

    def progress(stage: str, frac: float) -> None:
        with _video_jobs_lock:
            j = _video_jobs.get(job_id)
            if j is None:
                return
            j["stage"] = stage
            j["progress"] = max(0.0, min(1.0, float(frac)))

    with _video_jobs_lock:
        _video_jobs[job_id]["status"] = "running"
        _video_jobs[job_id]["stage"] = "starting"
        _video_jobs[job_id]["progress"] = 0.0
        _video_jobs[job_id]["started_at"] = time.time()

    try:
        _ensure_history(years)
        with _spc_lock:
            reports = list(_spc_state["reports"])
            spc_status = _spc_state["status"]
        if spc_status != "ready":
            raise RuntimeError(f"SPC data not ready (status={spc_status})")
        v = _video()
        if mode == "dramatization":
            # SEPARATE illustrative pipeline — photoreal CINEMATIC dramatization
            # (per-address Esri/OSM fly-in + fixed B-roll, watermarked +
            # disclaimered). Distinct filename prefix so it never gets confused
            # with the compliant occurrence record. The job still writes
            # <job_id>.mp4 into VIDEO_DRAMATIZATION_DIR so the existing
            # /api/video/file endpoint serves it unchanged; only the user-facing
            # download name carries the CINEMATIC prefix + safe label.
            result = v.render_cinematic_dramatization(
                lat=lat, lon=lon, label=label, radius_mi=radius_mi,
                reports=reports, out_path=out_path, progress=progress,
                years=years,
            )
            download_name = f"HailScan_DRAMATIZATION_CINEMATIC_{_safe_filename(label)}.mp4"
        else:
            result = v.render_history_video(
                lat=lat, lon=lon, label=label, radius_mi=radius_mi,
                reports=reports, out_path=out_path, progress=progress,
                years=years,
            )
            download_name = f"hail-history_{_safe_filename(label)}.mp4"
        with _video_jobs_lock:
            j = _video_jobs[job_id]
            j["status"] = "done"
            j["progress"] = 1.0
            j["stage"] = "ready"
            j["filename"] = download_name
            j["bytes"] = result["bytes"]
            j["days_rendered"] = result["days_rendered"]
            j["total_reports"] = result["total_reports"]
            j["finished_at"] = time.time()
    except Exception as e:
        traceback.print_exc()
        with _video_jobs_lock:
            j = _video_jobs[job_id]
            j["status"] = "error"
            j["error"] = str(e)
            j["finished_at"] = time.time()


def _cleanup_old_video_jobs() -> None:
    # Drop completed jobs (and their files) older than 1 hour to avoid disk creep.
    cutoff = time.time() - 3600
    with _video_jobs_lock:
        stale = [(jid, j.get("mode", "report")) for jid, j in _video_jobs.items()
                 if j.get("finished_at") and j["finished_at"] < cutoff]
        for jid, mode in stale:
            f = _video_dir_for_mode(mode) / f"{jid}.mp4"
            try:
                if f.exists():
                    f.unlink()
            except Exception:
                pass
            _video_jobs.pop(jid, None)


# ---- Public marketing site -------------------------------------------------

ROOT_DIR = Path(__file__).resolve().parent.parent
# Public SEO landing page (served at "/"; the internal dashboard moves to /app).
LANDING_FILE = ROOT_DIR / "landing" / "index.html"
# Public sign-in page (served at "/signin"); authenticates via Supabase GoTrue
# against the same project as the dashboard + iOS app, then redirects to /app.
SIGNIN_FILE = ROOT_DIR / "landing" / "signin.html"
# Public field-photo share viewer (served at "/share/<token>"). Self-contained
# HTML; it reads the token from the URL and fetches the existing public JSON
# route GET /api/share/<token>. Read once and cached (see _send_share_viewer).
SHARE_VIEWER_FILE = Path(__file__).resolve().parent / "share_viewer.html"
_share_viewer_cache: str | None = None
# Inbound report requests from the public landing-page order form land here as
# newline-delimited JSON. The dashboard CRM is the system of record; this is a
# simple, durable capture so a public request is never lost before triage.
ORDERS_DIR = ROOT_DIR / "data" / "orders"
_orders_lock = threading.Lock()
# Public, unauthenticated paths the auth gate must never block. The marketing
# site only needs the access-request intake now; the product's lookups (geocode,
# nearby, batch, pdf) all sit behind sign-in so we never expose results — or the
# method — to anonymous visitors.
PUBLIC_API_PATHS = {"/api/access-request"}

# Public canonical origin for SEO artifacts. Override via SITE_ORIGIN env when
# the public host differs (e.g. a custom domain behind a reverse proxy).
SITE_ORIGIN = os.environ.get("SITE_ORIGIN", "https://hailscan.app").rstrip("/")
ROBOTS_TXT = (
    "User-agent: *\n"
    "Allow: /\n"
    # The authenticated app and API surface add no SEO value and shouldn't be
    # crawled; keep crawlers on the public marketing page.
    "Disallow: /app\n"
    "Disallow: /dashboard\n"
    "Disallow: /api/\n"
    f"Sitemap: {SITE_ORIGIN}/sitemap.xml\n"
)
SITEMAP_XML = (
    '<?xml version="1.0" encoding="UTF-8"?>\n'
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    f"  <url><loc>{SITE_ORIGIN}/</loc><changefreq>weekly</changefreq>"
    "<priority>1.0</priority></url>\n"
    "</urlset>\n"
)
LEGAL_INTERIM_HTML = (
    "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"utf-8\">"
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">"
    "<title>Legal &amp; Disclosures — HailScan</title>"
    "<meta name=\"robots\" content=\"noindex, follow\">"
    "<style>body{margin:0;background:#0a0e16;color:#eaf2fb;"
    "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.65}"
    ".w{max-width:720px;margin:0 auto;padding:4rem 22px}a{color:#7dd3fc}"
    "h1{letter-spacing:-.02em}p{color:#9fb1c6}.box{background:#111a2b;"
    "border:1px solid rgba(125,211,252,.14);border-radius:14px;padding:1.5rem;margin:1.5rem 0}"
    "</style></head><body><div class=\"w\">"
    "<p><a href=\"/\">&larr; Back to HailScan</a></p>"
    "<h1>Legal &amp; disclosures</h1>"
    "<p>A HailScan report documents whether severe weather was <em>reported near</em> "
    "a location. It is <strong>not a damage assessment, inspection, insurance "
    "adjustment, claim recommendation, or legal advice,</strong> and issuing a report "
    "is not an act of public adjusting. A report does not confirm that hail struck any "
    "specific roof or structure; confirming any damage requires a physical inspection "
    "by a qualified, licensed professional.</p>"
    "<p>HailScan is an independent provider and is <strong>not affiliated with, "
    "endorsed by, or sponsored by any government agency.</strong></p>"
    "<div class=\"box\"><h3 style=\"margin-top:0\">Terms of Service &amp; Privacy Policy</h3>"
    "<p style=\"margin-bottom:0\">Our full Terms of Service and Privacy Policy are being "
    "finalized for publication. To request the current documents or ask a scope "
    "question, <a href=\"/signin#create\">contact us here</a>.</p></div>"
    "</div></body></html>"
)


# ---- PDF job state ---------------------------------------------------------

PDF_DIR = Path(__file__).resolve().parent.parent / "data" / "pdfs"
_pdf_jobs_lock = threading.Lock()
_pdf_jobs: dict[str, dict] = {}
# Job dict: {id, status, progress, stage, error, label, filename, bytes, pages,
#            started_at, finished_at}


def _run_pdf_job(job_id: str, lat: float, lon: float, label: str, radius_mi: float,
                 years: int = 2, include_measurement: bool = False) -> None:
    out_path = PDF_DIR / f"{job_id}.pdf"
    out_path.parent.mkdir(parents=True, exist_ok=True)

    def progress(stage: str, frac: float) -> None:
        with _pdf_jobs_lock:
            j = _pdf_jobs.get(job_id)
            if j is None:
                return
            j["stage"] = stage
            j["progress"] = max(0.0, min(1.0, float(frac)))

    with _pdf_jobs_lock:
        _pdf_jobs[job_id]["status"] = "running"
        _pdf_jobs[job_id]["stage"] = "starting"
        _pdf_jobs[job_id]["progress"] = 0.0
        _pdf_jobs[job_id]["started_at"] = time.time()

    try:
        _ensure_history(years)
        with _spc_lock:
            reports = list(_spc_state["reports"])
            spc_status = _spc_state["status"]
        if spc_status != "ready":
            raise RuntimeError(f"SPC data not ready (status={spc_status})")
        p = _pdf()
        result = p.render_pdf_report(
            lat=lat, lon=lon, label=label, radius_mi=radius_mi,
            reports=reports, out_path=out_path, progress=progress,
            years=years, include_measurement=include_measurement,
        )
        with _pdf_jobs_lock:
            j = _pdf_jobs[job_id]
            j["status"] = "done"
            j["progress"] = 1.0
            j["stage"] = "ready"
            j["filename"] = f"hail-history_{_safe_filename(label)}.pdf"
            j["bytes"] = result["bytes"]
            j["pages"] = result.get("pages", 0)
            j["days_rendered"] = result.get("days_rendered", 0)
            j["total_reports"] = result.get("total_reports", 0)
            j["report_id"] = result.get("report_id")
            j["finished_at"] = time.time()
    except Exception as e:
        traceback.print_exc()
        with _pdf_jobs_lock:
            j = _pdf_jobs[job_id]
            j["status"] = "error"
            j["error"] = str(e)
            j["finished_at"] = time.time()


def _cleanup_old_pdf_jobs() -> None:
    cutoff = time.time() - 3600
    with _pdf_jobs_lock:
        stale = [jid for jid, j in _pdf_jobs.items()
                 if j.get("finished_at") and j["finished_at"] < cutoff]
        for jid in stale:
            f = PDF_DIR / f"{jid}.pdf"
            try:
                if f.exists():
                    f.unlink()
            except Exception:
                pass
            _pdf_jobs.pop(jid, None)


# ---- SPC in-memory state ---------------------------------------------------

_spc_lock = threading.Lock()
_spc_state: dict = {
    "reports": [],            # list[HailReport] — may grow as background extends
    "ranked_days": [],        # precomputed, sorted by max_size
    "ranked_reports": [],     # top 200 by size
    "last_updated": None,
    "status": "loading",      # loading | ready | error
    "history_days": SPC_HISTORY_DAYS,        # the cap we may eventually hold
    "history_days_loaded": 0,                # actual days loaded so far
    "error": None,
}
_spc_extend_lock = threading.Lock()   # serializes synchronous on-demand extends


def _rerank_unlocked(reports: list) -> None:
    """Recompute ranked_days / ranked_reports from a reports SNAPSHOT.

    The heavy O(n log n) ranking (over ~78k reports) is done WITHOUT holding
    _spc_lock so it doesn't briefly block every API call each refresh cycle.
    The computed results are then stored under a short lock. rank_days /
    rank_reports are pure (they never mutate the input), so ranking a snapshot
    taken before the merge is safe."""
    ranked_days = spc.rank_days(reports)
    ranked_reports = spc.rank_reports(reports, limit=200)
    with _spc_lock:
        _spc_state["ranked_days"] = ranked_days
        _spc_state["ranked_reports"] = ranked_reports


def _fetch_window(start: date, end: date, label: str) -> list:
    print(f"  [spc] {label}: fetching {(end - start).days + 1} days...", flush=True)
    t0 = time.time()
    reports = spc.fetch_range(start, end)
    print(f"  [spc] {label}: {len(reports)} reports in {time.time()-t0:.1f}s", flush=True)
    return reports


def _refresh_spc() -> None:
    """Phase 1: fetch the last SPC_FAST_PRELOAD_DAYS and mark status=ready
    immediately. Phase 2: spawn a background thread that fetches years 2-10
    and merges into _spc_state. Recent (phase 1) days are also refreshed every
    SPC_REFRESH_INTERVAL via the outer loop."""
    end = date.today()
    fast_start = end - timedelta(days=SPC_FAST_PRELOAD_DAYS)
    try:
        recent = _fetch_window(fast_start, end, "phase 1 (recent 2y)")
    except Exception as e:
        traceback.print_exc()
        with _spc_lock:
            _spc_state["status"] = "error"
            _spc_state["error"] = str(e)
        return

    with _spc_lock:
        # Merge with anything older we may already have (background extend).
        existing = _spc_state["reports"]
        # Drop existing reports that fall within the recent window — they are
        # superseded by the freshly fetched batch (recent days can mutate).
        cutoff = fast_start.isoformat()
        older = [r for r in existing if r.date < cutoff]
        merged = older + recent
        _spc_state["reports"] = merged
        _spc_state["history_days_loaded"] = max(
            _spc_state["history_days_loaded"], SPC_FAST_PRELOAD_DAYS
        )
        _spc_state["last_updated"] = datetime.now(timezone.utc).isoformat()
        _spc_state["status"] = "ready"
        _spc_state["error"] = None
        snapshot = list(merged)

    # Rank OUTSIDE the lock (sort over ~78k reports), then store under a short
    # lock — keeps the heavy sort from blocking concurrent API calls.
    _rerank_unlocked(snapshot)

    # Phase 2: background extend to 10y if not already done.
    with _spc_lock:
        need_extend = _spc_state["history_days_loaded"] < SPC_HISTORY_DAYS
    if need_extend:
        t = threading.Thread(
            target=_extend_history_background,
            args=(SPC_HISTORY_DAYS,),
            daemon=True, name="spc-extend",
        )
        t.start()


def _extend_history_background(target_days: int) -> None:
    """Fetch older years (between currently-loaded and target_days) and merge."""
    end = date.today()
    with _spc_lock:
        loaded = _spc_state["history_days_loaded"]
    if loaded >= target_days:
        return
    # Fetch [end - target_days, end - loaded - 1] — the older block we lack.
    older_end = end - timedelta(days=loaded + 1)
    older_start = end - timedelta(days=target_days)
    if older_start > older_end:
        return
    try:
        older = _fetch_window(older_start, older_end, f"phase 2 (extend to {target_days}d)")
    except Exception:
        traceback.print_exc()
        return
    with _spc_lock:
        existing_dates = {(r.date, r.time_utc, r.lat, r.lon, r.size_in)
                          for r in _spc_state["reports"]}
        merged = list(_spc_state["reports"])
        for r in older:
            key = (r.date, r.time_utc, r.lat, r.lon, r.size_in)
            if key not in existing_dates:
                merged.append(r)
                existing_dates.add(key)
        _spc_state["reports"] = merged
        _spc_state["history_days_loaded"] = target_days
        _spc_state["last_updated"] = datetime.now(timezone.utc).isoformat()
        snapshot = list(merged)

    # Rank OUTSIDE the lock (sort over ~78k reports), then store under a short
    # lock — keeps the heavy sort from blocking concurrent API calls.
    _rerank_unlocked(snapshot)


def _ensure_history(years: int) -> None:
    """Block until at least years*365 days of SPC data are loaded. If the
    background fetch hasn't reached that depth, fetch the gap synchronously."""
    try:
        years = max(1, min(10, int(years)))
    except (TypeError, ValueError):
        years = 2
    # Defense-in-depth: never fetch more than the full history window even if a
    # caller slips past the endpoint-level clamp.
    need_days = min(years * 365, SPC_HISTORY_DAYS)
    with _spc_lock:
        loaded = _spc_state["history_days_loaded"]
    if loaded >= need_days:
        return
    # Serialize synchronous extends so two callers don't fetch the same window.
    with _spc_extend_lock:
        with _spc_lock:
            loaded = _spc_state["history_days_loaded"]
        if loaded >= need_days:
            return
        _extend_history_background(need_days)


def _spc_background_loop() -> None:
    while True:
        try:
            _refresh_spc()
        except Exception:
            traceback.print_exc()
        time.sleep(SPC_REFRESH_INTERVAL)


def _start_spc_background() -> None:
    t = threading.Thread(target=_spc_background_loop, daemon=True, name="spc-refresh")
    t.start()


def _prewarm_scan() -> None:
    """Warm scan.py's in-memory scan cache for the latest feed so the first
    dashboard /api/scan returns instantly instead of paying the ~3s
    grib-decode + polygonize on first load. Runs once at boot."""
    try:
        t0 = time.time()
        with _scan_lock:
            _, product, arr, lats, lons = run_scan(date=None)
        # Also seed the grid cache so an immediate /api/mesh click works.
        with _grid_lock:
            _grid_state["product"] = product
            _grid_state["arr"] = arr
            _grid_state["lats"] = lats
            _grid_state["lons"] = lons
        print(f"  [scan] pre-warm complete ({product}) in {time.time()-t0:.1f}s", flush=True)
    except Exception:
        print("  [scan] pre-warm failed (non-fatal):", flush=True)
        traceback.print_exc()


def _start_scan_prewarm() -> None:
    t = threading.Thread(target=_prewarm_scan, daemon=True, name="scan-prewarm")
    t.start()


# ---- HTTP handler ----------------------------------------------------------

def render_shell() -> str:
    empty = {"type": "FeatureCollection", "features": [], "max_mm": 0.0, "product": ""}
    generated = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    config = {
        # Fall back to the HailScan project URL so the dashboard sign-in works
        # even on a no-auth localhost run where SUPABASE_URL isn't exported.
        "supabaseUrl": SUPABASE_URL or "https://eitnccqaysidqvgudeeb.supabase.co",
        "supabaseAnonKey": SUPABASE_ANON_KEY,
        # When true the browser must sign in (server gates /api/*). The dashboard
        # also falls back to showing the login on any 401, so this is just a hint.
        "requireAuth": REQUIRE_AUTH,
    }
    return (
        TEMPLATE.read_text()
        .replace("__INITIAL_GEOJSON__", json.dumps(empty))
        .replace("__PRODUCT__", "loading…")
        .replace("__GENERATED__", generated)
        .replace("__HAILSCAN_CONFIG__", json.dumps(config))
    )


# Browser origins allowed to call the API cross-origin (e.g. the Redwood deal
# platform calling a tunnelled HailScan). Comma-separated env override.
CORS_ALLOWED_ORIGINS = {
    o.strip()
    for o in os.environ.get(
        "HAILSCAN_CORS_ORIGINS",
        "https://aobaoc.com,http://localhost:5173,http://localhost:5180",
    ).split(",")
    if o.strip()
}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt: str, *args) -> None:
        print(f"  {self.address_string()} {fmt % args}", flush=True)

    def end_headers(self) -> None:
        # Echo the Origin back only when allowlisted, so every response path
        # (JSON, files, PDFs) gets CORS without per-endpoint changes.
        origin = self.headers.get("Origin", "")
        if origin in CORS_ALLOWED_ORIGINS:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        super().end_headers()

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(204)
        origin = self.headers.get("Origin", "")
        if origin in CORS_ALLOWED_ORIGINS:
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type")
            self.send_header("Access-Control-Max-Age", "86400")
        self.end_headers()

    def _send_json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        headers = [("Content-Type", "application/json"), ("Cache-Control", "no-store")]
        # Gzip large responses when the client accepts it (e.g. /api/scan is
        # multi-MB of GeoJSON; compresses ~6-8x). URLSession sends Accept-Encoding
        # gzip and decompresses transparently.
        accepts_gzip = "gzip" in self.headers.get("Accept-Encoding", "").lower()
        if accepts_gzip and len(body) > 1024:
            import gzip as _gzip
            body = _gzip.compress(body, compresslevel=6)
            headers.append(("Content-Encoding", "gzip"))
        self.send_response(status)
        for k, v in headers:
            self.send_header(k, v)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_html(self, status: int, html: str) -> None:
        body = html.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _send_text(self, status: int, text: str, content_type: str) -> None:
        body = text.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        # SEO/static assets may be cached briefly; they change rarely.
        self.send_header("Cache-Control", "public, max-age=3600")
        self.end_headers()
        self.wfile.write(body)

    def _send_landing(self) -> None:
        """Serve the public SEO landing page (cacheable, unlike the app shell)."""
        try:
            html = LANDING_FILE.read_text()
        except FileNotFoundError:
            # Fall back to the app shell so the root is never a hard 404.
            self._send_html(200, render_shell())
            return
        body = html.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "public, max-age=300")
        self.end_headers()
        self.wfile.write(body)

    def _send_landing_asset(self, name: str) -> None:
        """Serve a public marketing asset from landing/assets/ (images only)."""
        # Reject path traversal — only a bare image filename in the assets dir.
        if not name or "/" in name or "\\" in name or name.startswith("."):
            self._send_json(404, {"error": "not found"})
            return
        types = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
                 ".webp": "image/webp", ".svg": "image/svg+xml", ".avif": "image/avif"}
        ext = ("." + name.rsplit(".", 1)[1].lower()) if "." in name else ""
        if ext not in types:
            self._send_json(404, {"error": "not found"})
            return
        asset = ROOT_DIR / "landing" / "assets" / name
        if not asset.exists() or not asset.is_file():
            self._send_json(404, {"error": "not found"})
            return
        body = asset.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", types[ext])
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "public, max-age=86400")
        self.end_headers()
        self.wfile.write(body)

    def _send_signin(self) -> None:
        """Serve the public sign-in page.

        Static file; it authenticates against Supabase GoTrue (same project as
        the dashboard and iOS app) using the publishable anon key and redirects
        to /app on success. We inject window.__HAILSCAN__ so the page honours the
        server's SUPABASE_URL / SUPABASE_ANON_KEY env overrides instead of its
        baked-in fallbacks.
        """
        try:
            html = SIGNIN_FILE.read_text()
        except FileNotFoundError:
            # Fall back to the app shell, which carries its own login overlay.
            self._send_html(200, render_shell())
            return
        config = {
            "supabaseUrl": SUPABASE_URL or "https://eitnccqaysidqvgudeeb.supabase.co",
            "supabaseAnonKey": SUPABASE_ANON_KEY,
            "appUrl": "/app",
        }
        inject = "<script>window.__HAILSCAN__=" + json.dumps(config) + ";</script>"
        html = html.replace("<script>", inject + "\n<script>", 1)
        body = html.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _send_share_viewer(self) -> None:
        """Serve the public field-photo share viewer (read once, then cached).

        Static, self-contained HTML; it reads the token from window.location and
        fetches the existing public JSON route GET /api/share/<token>. Falls back
        to a minimal notice if the file is missing so the route is never a 500.
        """
        global _share_viewer_cache
        if _share_viewer_cache is None:
            try:
                _share_viewer_cache = SHARE_VIEWER_FILE.read_text()
            except FileNotFoundError:
                _share_viewer_cache = (
                    "<!DOCTYPE html><meta charset='utf-8'>"
                    "<title>Shared report — HailScan</title>"
                    "<body style='font-family:sans-serif;background:#0a0e16;color:#eaf2fb'>"
                    "<p style='max-width:32rem;margin:4rem auto'>This shared report "
                    "viewer is temporarily unavailable.</p></body>"
                )
        self._send_html(200, _share_viewer_cache)

    def _handle_order(self) -> None:
        """Capture a public report request from the landing-page order form.

        Appended as one JSON line to data/orders/orders.jsonl. Intentionally
        simple and dependency-free so a request is never lost; triage/CRM
        promotion happens separately in the dashboard.
        """
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        if length <= 0 or length > 64 * 1024:
            self._send_json(400, {"error": "empty or oversized request"})
            return
        try:
            payload = json.loads(self.rfile.read(length) or b"{}")
        except (ValueError, json.JSONDecodeError):
            self._send_json(400, {"error": "bad json"})
            return
        if not isinstance(payload, dict):
            self._send_json(400, {"error": "expected an object"})
            return

        name = str(payload.get("name", "")).strip()
        email = str(payload.get("email", "")).strip()
        address = str(payload.get("address", "")).strip()
        if not name or "@" not in email or not address:
            self._send_json(400, {"error": "name, email, and address are required"})
            return

        # Whitelist + length-cap the fields we persist; ignore anything else.
        def _clip(v: object, n: int = 2000) -> str:
            return str(v or "").strip()[:n]

        record = {
            "received_at": datetime.now(timezone.utc).isoformat(),
            "name": _clip(name, 200),
            "email": _clip(email, 320),
            "phone": _clip(payload.get("phone"), 60),
            "role": _clip(payload.get("role"), 80),
            "address": _clip(address, 500),
            "loss_date": _clip(payload.get("loss_date"), 40),
            "want_video": _clip(payload.get("want_video"), 10),
            "notes": _clip(payload.get("notes"), 4000),
            "source": "landing-page",
            "remote": self.address_string(),
        }
        try:
            ORDERS_DIR.mkdir(parents=True, exist_ok=True)
            line = json.dumps(record, separators=(",", ":")) + "\n"
            with _orders_lock:
                with open(ORDERS_DIR / "orders.jsonl", "a", encoding="utf-8") as fh:
                    fh.write(line)
        except OSError as e:
            print(f"  ! failed to persist order: {e}", flush=True)
            self._send_json(500, {"error": "could not record request"})
            return
        print(f"  + report request from {record['email']} for {record['address']}", flush=True)
        self._send_json(200, {"ok": True})

    def _handle_access_request(self) -> None:
        """Capture a public 'request access' submission from the sign-in page.

        Sign-up is request-only: we record the interest in Supabase
        (access_requests) for manual provisioning, and also append a durable
        JSON line locally so a request is never lost if Supabase is unreachable.
        """
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        if length <= 0 or length > 64 * 1024:
            self._send_json(400, {"error": "empty or oversized request"})
            return
        try:
            payload = json.loads(self.rfile.read(length) or b"{}")
        except (ValueError, json.JSONDecodeError):
            self._send_json(400, {"error": "bad json"})
            return
        if not isinstance(payload, dict):
            self._send_json(400, {"error": "expected an object"})
            return

        email = str(payload.get("email", "")).strip()
        if "@" not in email:
            self._send_json(400, {"error": "a valid email is required"})
            return

        def _clip(v: object, n: int = 2000) -> str:
            return str(v or "").strip()[:n]

        record = {
            "received_at": datetime.now(timezone.utc).isoformat(),
            "name": _clip(payload.get("name"), 200),
            "email": _clip(email, 320),
            "company": _clip(payload.get("company"), 200),
            "tier_interest": _clip(payload.get("tier_interest"), 40),
            "states": _clip(payload.get("states"), 400),
            "message": _clip(payload.get("message"), 4000),
            "source": "signin-page",
            "remote": self.address_string(),
        }
        # Durable local capture first (never lose a lead), then best-effort
        # Supabase insert for the triage queue.
        try:
            ORDERS_DIR.mkdir(parents=True, exist_ok=True)
            with _orders_lock:
                with open(ORDERS_DIR / "access_requests.jsonl", "a", encoding="utf-8") as fh:
                    fh.write(json.dumps(record, separators=(",", ":")) + "\n")
        except OSError as e:
            print(f"  ! failed to persist access request: {e}", flush=True)
        try:
            import subscriptions
            subscriptions.submit_access_request(record)
        except Exception as e:  # Supabase optional/unreachable — local copy stands
            print(f"  ! access request not synced to supabase: {e}", flush=True)
        print(f"  + access request from {record['email']} ({record['company'] or 'no company'})", flush=True)
        self._send_json(200, {"ok": True})

    def _authenticate(self) -> bool:
        """Gate /api/* requests when auth is enabled.

        Returns True if the request may proceed. If auth is required and the
        request lacks a valid Supabase access token, sends 401 and returns False.
        """
        if not REQUIRE_AUTH:
            return True
        header = self.headers.get("Authorization", "")
        if not header.lower().startswith("bearer "):
            self._send_json(401, {"error": "authentication required"})
            return False
        token = header[7:].strip()
        try:
            self.user_claims = verify_supabase_jwt(
                token,
                secret=SUPABASE_JWT_SECRET or None,
                jwks_url=SUPABASE_JWKS_URL or None,
            )
            return True
        except AuthError as e:
            self._send_json(401, {"error": f"invalid token: {e}"})
            return False

    def _bearer(self) -> str | None:
        h = self.headers.get("Authorization", "")
        return h[7:].strip() if h.lower().startswith("bearer ") else None

    def _subscription(self):
        """The signed-in user's subscription row (or None). Cached per user."""
        import subscriptions
        claims = getattr(self, "user_claims", None) or {}
        return subscriptions.for_user(claims.get("sub"), self._bearer())

    def _require_state_access(self, state: str | None, *, lat=None, lon=None) -> bool:
        """Coverage gate for an address search. Returns True if the request may
        proceed. On denial, sends 403 (out of coverage) or 402 (no/inactive sub)
        and returns False. A no-op when enforcement is disabled (localhost dev).

        Pass either a known `state` (from a geocode result) or lat/lon to reverse-
        geocode. Resolves to True (fail-open) only if the backend is unreachable,
        so a transient Supabase/Census outage never hard-blocks a paying user.
        """
        if not ENFORCE_SUBSCRIPTION:
            return True
        import subscriptions
        try:
            sub = self._subscription()
        except subscriptions.SubscriptionError:
            return True  # fail-open on backend outage; auth already verified identity
        if state is None and lat is not None and lon is not None:
            state = self._resolve_state(lat, lon)
        ok, reason = subscriptions.check_state(sub, state)
        if ok:
            return True
        active = subscriptions.is_active(sub)
        self._send_json(403 if active else 402,
                        {"error": reason, "code": "out_of_coverage" if active else "no_subscription"})
        return False

    def _resolve_state(self, lat: float, lon: float) -> str | None:
        try:
            return _state_for_point(lat, lon)
        except Exception:
            return None

    def _send_file(self, path: Path, filename: str, content_type: str) -> None:
        if not path.exists():
            self._send_json(404, {"error": "file not found"})
            return
        size = path.stat().st_size
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(size))
        self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        with open(path, "rb") as f:
            shutil.copyfileobj(f, self.wfile)

    def _json_body(self) -> dict:
        length = int(self.headers.get("Content-Length", "0") or "0")
        raw = self.rfile.read(length) if length else b"{}"
        return json.loads(raw or b"{}")

    def _crm(self, method: str, path: str, params: dict) -> None:
        """Dispatch /api/crm/<resource>[/<id>] to the CRM data layer (Supabase).

        Server-mediated so the browser never holds a DB key. Returns 503 when
        the CRM backend env isn't configured, so the rest of the app still works.
        """
        import crm  # lazy import: server starts fine even if CRM env is unset
        parts = path.strip("/").split("/")          # ['api','crm', resource?, id?, action?]
        resource = parts[2] if len(parts) > 2 else ""
        row_id = parts[3] if len(parts) > 3 else None
        action = parts[4] if len(parts) > 4 else None
        # Forward the signed-in user's JWT so PostgREST runs as `authenticated`
        # (no service key needed). Already verified by _authenticate when auth is on.
        auth_hdr = self.headers.get("Authorization", "")
        tok = auth_hdr[7:].strip() if auth_hdr.lower().startswith("bearer ") else None
        try:
            if resource == "summary" and method == "GET":
                self._send_json(200, crm.summary(token=tok)); return
            if resource == "processes" and method == "GET":
                self._send_json(200, crm.processes()); return
            if resource == "engagements" and method == "POST":
                self._send_json(200, crm.create_engagement(self._json_body(), token=tok)); return
            if resource not in crm.TABLES:
                self._send_json(404, {"error": "unknown crm resource"}); return
            if method == "GET" and row_id is None:
                flat = {k: v[0] for k, v in params.items()}
                self._send_json(200, crm.list_rows(resource, flat, token=tok)); return
            if method == "GET":
                if resource == "contacts":
                    self._send_json(200, crm.contact_full(row_id, token=tok)); return
                if resource == "deals":
                    self._send_json(200, crm.deal_full(row_id, token=tok)); return
                if resource == "campaigns":
                    self._send_json(200, crm.campaign_full(row_id, token=tok)); return
                if resource == "field_projects":
                    self._send_json(200, crm.project_full(row_id, token=tok)); return
                self._send_json(200, crm.get_row(resource, row_id, token=tok)); return
            if method == "POST" and resource == "properties" and row_id == "bulk":
                self._send_json(200, crm.bulk_add_properties(self._json_body(), token=tok)); return
            if method == "POST" and resource == "properties" and row_id and action == "convert":
                self._send_json(200, crm.convert_lead_to_deal(row_id, self._json_body(), token=tok)); return
            if method == "POST" and resource == "deliverables" and row_id and action == "attach":
                b = self._json_body() or {}
                self._send_json(200, crm.attach_deliverable_to_deal(
                    row_id, b.get("deal_id"), b.get("campaign_id"), token=tok)); return
            if method == "POST" and resource == "campaigns" and row_id is None:
                self._send_json(200, crm.create_campaign(self._json_body(), token=tok)); return
            if method == "POST":
                self._send_json(200, crm.create_row(resource, self._json_body(), token=tok)); return
            if method == "PATCH" and row_id:
                self._send_json(200, crm.update_row(resource, row_id, self._json_body(), token=tok)); return
            if method == "DELETE" and row_id:
                crm.delete_row(resource, row_id, token=tok)
                self._send_json(200, {"ok": True}); return
            self._send_json(405, {"error": "method not allowed for this path"})
        except crm.CRMNotConfigured as e:
            self._send_json(503, {"error": str(e)})
        except crm.CRMError as e:
            self._send_json(e.status, {"error": str(e)})
        except (ValueError, json.JSONDecodeError) as e:
            self._send_json(400, {"error": f"bad json: {e}"})
        except Exception as e:  # pragma: no cover
            traceback.print_exc()
            self._send_json(500, {"error": str(e)})

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        path = parsed.path
        params = parse_qs(parsed.query)

        # Public SEO landing page at the site root. The internal dashboard tool
        # now lives at /app (and /dashboard); both use relative /api/* paths so
        # nothing about the app breaks by moving it off "/".
        if path == "/":
            self._send_landing()
            return
        if path in ("/app", "/app/", "/dashboard", "/dashboard/"):
            self._send_html(200, render_shell())
            return
        if path in ("/signin", "/signin/", "/login", "/login/"):
            self._send_signin()
            return
        if path == "/robots.txt":
            self._send_text(200, ROBOTS_TXT, "text/plain; charset=utf-8")
            return
        if path == "/sitemap.xml":
            self._send_text(200, SITEMAP_XML, "application/xml; charset=utf-8")
            return
        if path in ("/legal", "/legal/"):
            # Interim, honest notice. The full ToS/Privacy drafts are not yet
            # cleared for publication (pending Florida attorney review), so we
            # state that plainly rather than publish unreviewed legal terms.
            self._send_html(200, LEGAL_INTERIM_HTML)
            return
        # Public static marketing assets (landing-page images: product shots, og).
        if path.startswith("/assets/"):
            self._send_landing_asset(path[len("/assets/"):])
            return

        # Public, unauthenticated share VIEWER page (tokenized field reports).
        # The HTML reads the token from the URL and calls /api/share/<token>.
        # Must sit BEFORE the /api/ auth gate (it's public). Note: only /share/
        # (not /api/share/) serves HTML; the JSON route is handled below.
        if path.startswith("/share/") or path == "/share":
            self._send_share_viewer()
            return

        # Public, unauthenticated share viewer data (tokenized field reports).
        if path.startswith("/api/share/"):
            field_routes.handle_share_public(self, path[len("/api/share/"):].strip("/"), params)
            return

        if path.startswith("/api/") and path not in PUBLIC_API_PATHS and not self._authenticate():
            return

        # Field Documentation special GET routes (before the generic /api/crm).
        if path == "/api/crm/field_photos/download-url":
            field_routes.handle_download_url(self, params)
            return
        if path == "/api/crm/deliverables/download-url":
            field_routes.handle_deliverable_download_url(self, params)
            return
        if path == "/api/field-report/status":
            field_routes.handle_report_status(self, params)
            return
        if path == "/api/field-report/file":
            field_routes.handle_report_file(self, params)
            return

        if path.startswith("/api/crm"):
            self._crm("GET", path, params)
            return

        if path == "/api/scan":
            date_str = params.get("date", [None])[0]
            if date_str and not DATE_RE.match(date_str):
                self._send_json(400, {"error": "date must be YYYY-MM-DD"})
                return
            try:
                with _scan_lock:
                    geojson, product, arr, lats, lons = run_scan(date=date_str)
                with _grid_lock:
                    _grid_state["product"] = product
                    _grid_state["arr"] = arr
                    _grid_state["lats"] = lats
                    _grid_state["lons"] = lons
                self._send_json(200, geojson)
            except Exception as e:
                traceback.print_exc()
                self._send_json(500, {"error": str(e)})
            return

        if path == "/api/topdays":
            try:
                limit = int(params.get("limit", ["30"])[0])
            except (TypeError, ValueError):
                limit = 30
            limit = max(1, min(500, limit))
            try:
                years = int(params.get("years", ["2"])[0])
            except (TypeError, ValueError):
                years = 2
            years = max(1, min(10, years))
            _ensure_history(years)
            with _spc_lock:
                reports = _spc_state["reports"]
                status = _spc_state["status"]
                last_updated = _spc_state["last_updated"]
                error = _spc_state["error"]
                loaded = _spc_state["history_days_loaded"]
            filtered = spc.filter_reports_by_years(reports, years)
            ranked = spc.rank_days(filtered)
            self._send_json(200, {
                "status": status,
                "last_updated": last_updated,
                "history_days": loaded,
                "years": years,
                "error": error,
                "days": ranked[:limit],
            })
            return

        if path == "/api/topreports":
            try:
                limit = int(params.get("limit", ["30"])[0])
            except (TypeError, ValueError):
                limit = 30
            limit = max(1, min(500, limit))
            try:
                years = int(params.get("years", ["2"])[0])
            except (TypeError, ValueError):
                years = 2
            years = max(1, min(10, years))
            _ensure_history(years)
            with _spc_lock:
                reports = _spc_state["reports"]
                status = _spc_state["status"]
                last_updated = _spc_state["last_updated"]
                error = _spc_state["error"]
                loaded = _spc_state["history_days_loaded"]
            filtered = spc.filter_reports_by_years(reports, years)
            ranked = spc.rank_reports(filtered, limit=max(200, limit))
            self._send_json(200, {
                "status": status,
                "last_updated": last_updated,
                "history_days": loaded,
                "years": years,
                "error": error,
                "reports": ranked[:limit],
            })
            return

        if path == "/api/geocode":
            q = (params.get("q", [""])[0] or "").strip()
            if not q:
                self._send_json(400, {"error": "q required"})
                return
            try:
                self._send_json(200, _geocode(q))
            except Exception as e:
                self._send_json(502, {"error": f"geocoder failed: {e}"})
            return

        if path == "/api/mesh":
            try:
                lat = float(params["lat"][0])
                lon = float(params["lon"][0])
            except (KeyError, ValueError, IndexError):
                self._send_json(400, {"error": "lat and lon required (floats)"})
                return
            if not _valid_point(lat, lon):
                self._send_json(400, {"error": "lat/lon out of range or not finite"})
                return
            with _grid_lock:
                arr = _grid_state["arr"]
                lats_arr = _grid_state["lats"]
                lons_arr = _grid_state["lons"]
                product = _grid_state["product"]
            if arr is None:
                self._send_json(503, {"error": "no grid loaded — run a scan first"})
                return
            mm, cell_lat, cell_lon = mesh_at(arr, lats_arr, lons_arr, lat, lon)
            self._send_json(200, {
                "lat": lat, "lon": lon,
                "cell_lat": cell_lat, "cell_lon": cell_lon,
                "mesh_mm": mm, "mesh_in": round(mm / 25.4, 3),
                "product": product,
            })
            return

        if path == "/api/video/status":
            job_id = params.get("job_id", [""])[0]
            with _video_jobs_lock:
                j = _video_jobs.get(job_id)
                if not j:
                    self._send_json(404, {"error": "job not found"})
                    return
                self._send_json(200, {
                    "id": j["id"],
                    "status": j["status"],
                    "progress": j.get("progress", 0.0),
                    "stage": j.get("stage", ""),
                    "error": j.get("error"),
                    "filename": j.get("filename"),
                    "bytes": j.get("bytes"),
                    "days_rendered": j.get("days_rendered"),
                    "mode": j.get("mode", "report"),
                })
            return

        if path == "/api/video/file":
            job_id = params.get("job_id", [""])[0]
            with _video_jobs_lock:
                j = _video_jobs.get(job_id)
                if not j or j.get("status") != "done":
                    self._send_json(404, {"error": "video not ready"})
                    return
                filename = j["filename"]
                mode = j.get("mode", "report")
            self._send_file(_video_dir_for_mode(mode) / f"{job_id}.mp4", filename, "video/mp4")
            return

        if path == "/api/pdf/status":
            job_id = params.get("job_id", [""])[0]
            with _pdf_jobs_lock:
                j = _pdf_jobs.get(job_id)
                if not j:
                    self._send_json(404, {"error": "job not found"})
                    return
                self._send_json(200, {
                    "id": j["id"],
                    "status": j["status"],
                    "progress": j.get("progress", 0.0),
                    "stage": j.get("stage", ""),
                    "error": j.get("error"),
                    "filename": j.get("filename"),
                    "bytes": j.get("bytes"),
                    "pages": j.get("pages"),
                    "days_rendered": j.get("days_rendered"),
                    "total_reports": j.get("total_reports"),
                    "report_id": j.get("report_id"),
                })
            return

        if path == "/api/pdf/file":
            job_id = params.get("job_id", [""])[0]
            with _pdf_jobs_lock:
                j = _pdf_jobs.get(job_id)
                if not j or j.get("status") != "done":
                    self._send_json(404, {"error": "pdf not ready"})
                    return
                filename = j["filename"]
            self._send_file(PDF_DIR / f"{job_id}.pdf", filename, "application/pdf")
            return

        if path == "/api/nearby":
            try:
                lat = float(params["lat"][0])
                lon = float(params["lon"][0])
            except (KeyError, ValueError, IndexError):
                self._send_json(400, {"error": "lat and lon required (floats)"})
                return
            if not _valid_point(lat, lon):
                self._send_json(400, {"error": "lat/lon out of range or not finite"})
                return
            try:
                radius = float(params.get("radius", ["10"])[0])
            except (TypeError, ValueError):
                radius = 10.0
            if not _valid_radius(radius):
                self._send_json(400, {"error": "radius must be finite and in (0, 100]"})
                return
            # Coverage gate: the caller may supply the state (cheap), else we
            # reverse-geocode the point.
            state_hint = (params.get("state", [None])[0] or None)
            if not self._require_state_access(state_hint, lat=lat, lon=lon):
                return
            try:
                years = int(params.get("years", ["2"])[0])
            except (TypeError, ValueError):
                years = 2
            years = max(1, min(10, years))
            _ensure_history(years)
            with _spc_lock:
                reports = _spc_state["reports"]
                status = _spc_state["status"]
            if status != "ready":
                self._send_json(503, {"error": f"spc data not ready (status={status})"})
                return
            filtered = spc.filter_reports_by_years(reports, years)
            result = spc.rank_days_at_point(filtered, lat, lon, radius)
            result["status"] = status
            result["years"] = years
            self._send_json(200, result)
            return

        self._send_json(404, {"error": "not found"})

    def do_POST(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        path = parsed.path

        # Public "request access" intake from the sign-in page — no login
        # required (sign-up is request-only, not self-serve).
        if path == "/api/access-request":
            self._handle_access_request()
            return

        # Legacy landing-page order intake (kept for any old links).
        if path == "/api/order":
            self._handle_order()
            return

        if path.startswith("/api/") and path not in PUBLIC_API_PATHS and not self._authenticate():
            return

        # Field Documentation special POST routes (before the generic /api/crm).
        if path == "/api/crm/field_photos/upload-url":
            field_routes.handle_upload_url(self)
            return
        if path == "/api/crm/field_photos/sign-batch":
            field_routes.handle_sign_batch(self)
            return
        _fin = re.match(r"^/api/crm/field_photos/([0-9a-fA-F-]{8,})/finalize$", path)
        if _fin:
            field_routes.handle_finalize(self, _fin.group(1))
            return
        if path == "/api/crm/field_share_links":
            field_routes.handle_share_create(self)
            return
        if path == "/api/field-report/start":
            field_routes.handle_report_start(self)
            return

        if path.startswith("/api/crm"):
            self._crm("POST", path, {})
            return

        if path == "/api/video/start":
            try:
                length = int(self.headers.get("Content-Length", "0"))
                body = self.rfile.read(length) if length else b"{}"
                payload = json.loads(body or b"{}")
            except (ValueError, json.JSONDecodeError) as e:
                self._send_json(400, {"error": f"bad json: {e}"})
                return
            try:
                lat = float(payload["lat"])
                lon = float(payload["lon"])
            except (KeyError, ValueError, TypeError):
                self._send_json(400, {"error": "lat and lon required (floats)"})
                return
            if not _valid_point(lat, lon):
                self._send_json(400, {"error": "lat/lon out of range or not finite"})
                return
            label = str(payload.get("label") or f"{lat:.4f}, {lon:.4f}")
            try:
                radius_mi = float(payload.get("radius", 10))
            except (TypeError, ValueError):
                radius_mi = 10.0
            if not _valid_radius(radius_mi):
                self._send_json(400, {"error": "radius must be finite and in (0, 100]"})
                return
            try:
                years = int(payload.get("years", 2))
            except (TypeError, ValueError):
                years = 2
            years = max(1, min(10, years))

            # Mode flag selects the pipeline. "dramatization" renders the
            # SEPARATE illustrative-CGI asset (watermarked, disclaimered) into a
            # distinct output dir; anything else renders the compliant report.
            mode = str(payload.get("mode") or "report").strip().lower()
            if mode not in ("report", "dramatization"):
                mode = "report"

            with _spc_lock:
                spc_status = _spc_state["status"]
            if spc_status != "ready":
                self._send_json(503, {"error": f"spc data not ready (status={spc_status})"})
                return

            _cleanup_old_video_jobs()

            job_id = uuid.uuid4().hex[:12]
            with _video_jobs_lock:
                _video_jobs[job_id] = {
                    "id": job_id,
                    "status": "queued",
                    "progress": 0.0,
                    "stage": "queued",
                    "label": label,
                    "lat": lat, "lon": lon, "radius_mi": radius_mi,
                    "years": years,
                    "mode": mode,
                }
            t = threading.Thread(
                target=_run_video_job,
                args=(job_id, lat, lon, label, radius_mi, years, mode),
                name=f"video-{job_id}", daemon=True,
            )
            t.start()
            self._send_json(200, {"job_id": job_id, "status": "queued", "mode": mode})
            return

        if path == "/api/pdf/start":
            try:
                length = int(self.headers.get("Content-Length", "0"))
                body = self.rfile.read(length) if length else b"{}"
                payload = json.loads(body or b"{}")
            except (ValueError, json.JSONDecodeError) as e:
                self._send_json(400, {"error": f"bad json: {e}"})
                return
            try:
                lat = float(payload["lat"])
                lon = float(payload["lon"])
            except (KeyError, ValueError, TypeError):
                self._send_json(400, {"error": "lat and lon required (floats)"})
                return
            if not _valid_point(lat, lon):
                self._send_json(400, {"error": "lat/lon out of range or not finite"})
                return
            label = str(payload.get("label") or f"{lat:.4f}, {lon:.4f}")
            try:
                radius_mi = float(payload.get("radius", 10))
            except (TypeError, ValueError):
                radius_mi = 10.0
            if not _valid_radius(radius_mi):
                self._send_json(400, {"error": "radius must be finite and in (0, 100]"})
                return
            try:
                years = int(payload.get("years", 2))
            except (TypeError, ValueError):
                years = 2
            years = max(1, min(10, years))
            # Opt-in (default off) per-report aerial property measurement.
            include_measurement = bool(payload.get("include_measurement"))

            # Coverage gate before we spend a render on an out-of-coverage address.
            if not self._require_state_access(payload.get("state"), lat=lat, lon=lon):
                return

            with _spc_lock:
                spc_status = _spc_state["status"]
            if spc_status != "ready":
                self._send_json(503, {"error": f"spc data not ready (status={spc_status})"})
                return

            _cleanup_old_pdf_jobs()

            job_id = uuid.uuid4().hex[:12]
            with _pdf_jobs_lock:
                _pdf_jobs[job_id] = {
                    "id": job_id,
                    "status": "queued",
                    "progress": 0.0,
                    "stage": "queued",
                    "label": label,
                    "lat": lat, "lon": lon, "radius_mi": radius_mi,
                    "years": years,
                    "include_measurement": include_measurement,
                }
            t = threading.Thread(
                target=_run_pdf_job,
                args=(job_id, lat, lon, label, radius_mi, years,
                      include_measurement),
                name=f"pdf-{job_id}", daemon=True,
            )
            t.start()
            self._send_json(200, {"job_id": job_id, "status": "queued"})
            return

        if path == "/api/batch":
            try:
                length = int(self.headers.get("Content-Length", "0"))
                body = self.rfile.read(length) if length else b"{}"
                payload = json.loads(body or b"{}")
            except (ValueError, json.JSONDecodeError) as e:
                self._send_json(400, {"error": f"bad json: {e}"})
                return

            addresses = payload.get("addresses") or []
            if not isinstance(addresses, list) or not addresses:
                self._send_json(400, {"error": "addresses[] required"})
                return
            if len(addresses) > 200:
                self._send_json(400, {"error": "max 200 addresses per batch"})
                return
            try:
                radius = float(payload.get("radius", 10))
            except (TypeError, ValueError):
                self._send_json(400, {"error": "radius must be a number"})
                return
            if not _valid_radius(radius):
                self._send_json(400, {"error": "radius must be finite and in (0, 100]"})
                return
            try:
                years = int(payload.get("years", 2))
            except (TypeError, ValueError):
                years = 2
            years = max(1, min(10, years))

            _ensure_history(years)
            with _spc_lock:
                reports = _spc_state["reports"]
                spc_status = _spc_state["status"]
            if spc_status != "ready":
                self._send_json(503, {"error": f"spc data not ready (status={spc_status})"})
                return
            filtered = spc.filter_reports_by_years(reports, years)

            # Coverage gate (once per batch). An inactive/missing subscription
            # blocks the whole batch; an active limited plan filters per-address
            # so in-coverage addresses still return while others are flagged.
            import subscriptions
            sub = None
            if ENFORCE_SUBSCRIPTION:
                try:
                    sub = self._subscription()
                except subscriptions.SubscriptionError:
                    sub = None  # fail-open on backend outage
                else:
                    if not subscriptions.is_active(sub):
                        _ok, reason = subscriptions.check_state(sub, None)
                        self._send_json(402, {"error": reason, "code": "no_subscription"})
                        return

            results = []
            for raw_q in addresses:
                q = (raw_q or "").strip() if isinstance(raw_q, str) else ""
                if not q:
                    results.append({"query": raw_q, "error": "empty"})
                    continue
                try:
                    geo = _geocode(q, limit=1)
                except Exception as e:
                    results.append({"query": q, "error": f"geocode failed: {e}"})
                    continue
                if not geo:
                    results.append({"query": q, "error": "no match"})
                    continue
                pick = geo[0]
                # Enforce coverage per address. Use the geocoded state when present,
                # else reverse-geocode the point so we never trust an absent field.
                if ENFORCE_SUBSCRIPTION and sub is not None and sub.get("tier") != "nationwide":
                    st = subscriptions.normalize_state(pick.get("state")) or \
                        self._resolve_state(pick["lat"], pick["lon"])
                    if not subscriptions.allows_state(sub, st):
                        results.append({"query": q, "geocode": pick,
                                        "error": "out of coverage", "state": st})
                        continue
                nearby = spc.rank_days_at_point(filtered, pick["lat"], pick["lon"], radius)
                results.append({
                    "query": q,
                    "geocode": pick,
                    "nearby": nearby,
                })

            resp = {
                "radius_mi": radius,
                "years": years,
                "count": len(results),
                "results": results,
            }
            # Opt-in: persist this batch as a CRM campaign, seeding one lead per
            # geocoded address. Default-off keeps existing batch + iOS Route
            # behavior byte-for-byte. Never fails the batch on a CRM outage.
            if payload.get("save_campaign"):
                auth_hdr = self.headers.get("Authorization", "")
                tok = auth_hdr[7:].strip() if auth_hdr.lower().startswith("bearer ") else None
                try:
                    import crm
                    geocoded = [r for r in results if (r.get("geocode") or {}).get("lat") is not None]
                    clat = clon = None
                    if geocoded:
                        clat = sum(r["geocode"]["lat"] for r in geocoded) / len(geocoded)
                        clon = sum(r["geocode"]["lon"] for r in geocoded) / len(geocoded)
                    camp_body = {
                        "name": payload.get("campaign_name") or payload.get("name") or "Storm canvass",
                        "process": payload.get("process"),
                        "contact_id": payload.get("contact_id"),
                        "assigned_to": payload.get("assigned_to"),
                        "kind": payload.get("kind") or "storm_canvass",
                        "lead_filter": payload.get("lead_filter") or "all",
                        "storm_date": payload.get("storm_date"),
                        "radius_mi": radius, "years": years,
                        "center_lat": clat, "center_lon": clon,
                    }
                    out = crm.run_campaign_batch(camp_body, results, token=tok)
                    resp["campaign_id"] = out.get("campaign_id")
                    resp["campaign"] = out.get("campaign")
                    resp["leads_created"] = out.get("inserted")
                except Exception as e:  # CRMNotConfigured / CRMError / anything: never fail the batch
                    resp["campaign_error"] = str(e)
            self._send_json(200, resp)
            return

        self._send_json(404, {"error": "not found"})

    def do_PATCH(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        path = parsed.path
        if path.startswith("/api/") and not self._authenticate():
            return
        if path.startswith("/api/crm"):
            self._crm("PATCH", path, parse_qs(parsed.query))
            return
        self._send_json(404, {"error": "not found"})

    def do_DELETE(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        path = parsed.path
        if path.startswith("/api/") and not self._authenticate():
            return
        # Field Documentation deletes also GC their storage objects.
        _pdel = re.match(r"^/api/crm/field_photos/([0-9a-fA-F-]{8,})$", path)
        if _pdel:
            field_routes.handle_photo_delete(self, _pdel.group(1))
            return
        _projdel = re.match(r"^/api/crm/field_projects/([0-9a-fA-F-]{8,})$", path)
        if _projdel:
            field_routes.handle_project_delete(self, _projdel.group(1))
            return
        if path.startswith("/api/crm"):
            self._crm("DELETE", path, parse_qs(parsed.query))
            return
        self._send_json(404, {"error": "not found"})


def main() -> int:
    parser = argparse.ArgumentParser(description="Run the hailscan dashboard server.")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument(
        "--host",
        default="127.0.0.1",
        help="Bind address. Default 127.0.0.1 (localhost only). Use 0.0.0.0 to "
             "accept LAN connections, e.g. for testing the iOS app on a physical "
             "device. WARNING: the API is unauthenticated — only do this on a "
             "trusted network.",
    )
    parser.add_argument("--no-open", action="store_true")
    args = parser.parse_args()

    _start_spc_background()
    # Pre-warm the latest scan in the background so the first /api/scan is hot.
    # Daemon thread — never blocks server startup.
    _start_scan_prewarm()
    # Field Documentation media worker pool + reconciliation sweep.
    field_routes.start_workers()

    server = ThreadingHTTPServer((args.host, args.port), Handler)
    url = f"http://localhost:{args.port}/"
    print(f"  hailscan serving at {url}")
    if args.host not in ("127.0.0.1", "localhost"):
        print(f"  also reachable on the LAN at  http://<this-mac-ip>:{args.port}/  (host={args.host})")
    print(f"  press ctrl-c to stop")

    if not args.no_open:
        threading.Timer(0.5, lambda: webbrowser.open(url)).start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  shutting down")
        server.shutdown()
    return 0


if __name__ == "__main__":
    sys.exit(main())
