#!/usr/bin/env python3
"""Codes&More — data layer (Ordinance-or-Law reports).

Self-contained PostgREST access (stdlib, service-key/forwarded-JWT) for cm_reports
+ cm_requirements, plus the glue that makes a report a first-class deliverable on
the SHARED job: creating a report ensures a crm_properties (core_jobs) row for the
address, and generating one writes a crm_deliverables row (kind='code_report',
product='codesandmore', cm_report_id) — so the Hub shows it on the same job as
Fieldcam photos and HailScan reports.

The code/jurisdiction CONTENT (the actual requirements) is entered by the user or,
later, pulled from a jurisdiction-data provider. Nothing here invents code text.
"""
from __future__ import annotations

import base64
import json
import os
import urllib.error
import urllib.parse
import urllib.request

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://eitnccqaysidqvgudeeb.supabase.co").rstrip("/")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
ANON_KEY = os.environ.get(
    "SUPABASE_ANON_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpdG5jY3FheXNpZHF2Z3VkZWViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0NjAzODYsImV4cCI6MjA5NjAzNjM4Nn0.i9-7j0USLioV_p-ZKCfWTHS9SOxv54R1Jqg0lDTH94g",
)

REPORT_FIELDS = {"property_id", "address", "city", "state", "jurisdiction", "code_cycle",
                 "title", "summary", "status", "source", "job_id", "file_url", "created_by"}
REQ_FIELDS = {"report_id", "category", "code_source", "section", "requirement", "trigger",
              "applies", "cost_estimate_cents", "notes", "sort_order"}


class CMError(Exception):
    def __init__(self, status: int, message: str):
        self.status = status
        super().__init__(message)


class CMNotConfigured(Exception):
    pass


def configured() -> bool:
    return bool(SUPABASE_URL and (SERVICE_KEY or ANON_KEY))


def _auth(token: str | None) -> tuple[str, str]:
    if SERVICE_KEY:
        return SERVICE_KEY, SERVICE_KEY
    if token:
        return ANON_KEY, token
    raise CMNotConfigured("Codes&More requires a signed-in user (or SUPABASE_SERVICE_ROLE_KEY)")


def _req(method: str, table: str, params: dict | None = None, body=None,
         prefer: str | None = None, token: str | None = None):
    if not SUPABASE_URL:
        raise CMNotConfigured("SUPABASE_URL not configured")
    apikey, bearer = _auth(token)
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    if params:
        url += "?" + urllib.parse.urlencode(params, doseq=True)
    data = json.dumps(body).encode() if body is not None else None
    headers = {"apikey": apikey, "Authorization": f"Bearer {bearer}", "Accept": "application/json"}
    if data is not None:
        headers["Content-Type"] = "application/json"
    if prefer:
        headers["Prefer"] = prefer
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            text = r.read().decode()
            return json.loads(text) if text.strip() else None
    except urllib.error.HTTPError as e:
        detail = ""
        try:
            detail = e.read().decode()[:400]
        except Exception:
            pass
        raise CMError(400 if 400 <= e.code < 500 else 502, f"supabase {e.code}: {detail or e.reason}")
    except urllib.error.URLError as e:
        raise CMError(502, f"supabase unreachable: {e.reason}")


def claims_subject(token: str | None) -> str | None:
    if not token:
        return None
    try:
        p = token.split(".")[1]
        p += "=" * (-len(p) % 4)
        return json.loads(base64.urlsafe_b64decode(p)).get("sub")
    except Exception:
        return None


def _clean(fields: set[str], body: dict) -> dict:
    return {k: v for k, v in (body or {}).items() if k in fields}


# ---- App-layer tenant scoping (mirrors fieldcam/bin/crm.py) ------------------
# This server talks to PostgREST with the service-role key, which BYPASSES RLS,
# so org isolation must be enforced HERE: every read carries an org_id filter
# and every write stamps org_id from the resolved caller (entitlements.Caller).
# caller=None (auth off / server-side worker jobs) keeps the old single-org
# behavior: unscoped, with the DB column DEFAULT supplying org_id on insert.

def _org_params(caller) -> dict:
    """PostgREST filter params scoping a query to the caller's org(s)."""
    if caller is None or not getattr(caller, "user_id", None):
        return {}
    if getattr(caller, "is_platform_admin", False):
        return {}
    org_ids = [o for o in (getattr(caller, "org_ids", None) or []) if o]
    if not org_ids:
        raise CMError(403, "no organization is associated with this account")
    return {"org_id": f"in.({','.join(org_ids)})"}


def _stamp_org(body: dict, caller) -> dict:
    """Stamp org_id onto a write body from the caller's primary org.
    The DB column DEFAULT is the backstop; this makes the tenant explicit."""
    oid = getattr(caller, "primary_org_id", None) if caller is not None else None
    if oid:
        body["org_id"] = oid
    return body


# ---- reports ---------------------------------------------------------------
def list_reports(token: str | None = None, caller=None) -> list:
    return _req("GET", "cm_reports",
                {"select": "*", "order": "created_at.desc", "limit": "500",
                 **_org_params(caller)}, token=token) or []


def get_report(report_id: str, token: str | None = None, caller=None) -> dict:
    rows = _req("GET", "cm_reports", {"select": "*", "id": f"eq.{report_id}", "limit": "1",
                                      **_org_params(caller)}, token=token) or []
    if not rows:
        raise CMError(404, "report not found")
    report = rows[0]
    report["requirements"] = _req("GET", "cm_requirements",
                                  {"select": "*", "report_id": f"eq.{report_id}",
                                   "order": "sort_order.asc,created_at.asc"}, token=token) or []
    return report


def create_report(body: dict, token: str | None = None, caller=None) -> dict:
    address = (body or {}).get("address")
    if not address:
        raise CMError(400, "address is required")
    # ensure a shared Job (crm_properties / core_jobs) for the address: reuse the
    # org's existing property row so the report lands on the SAME job as Fieldcam
    # photos and HailScan reports for that address, instead of forking a duplicate
    existing = _req("GET", "crm_properties",
                    {"select": "id", "address": f"eq.{address}", "limit": "1",
                     **_org_params(caller)}, token=token) or []
    if existing:
        property_id = existing[0].get("id")
    else:
        prop = _req("POST", "crm_properties", body=_stamp_org({
            "address": address, "city": body.get("city"), "state": body.get("state"),
        }, caller), prefer="return=representation", token=token)
        property_id = (prop or [{}])[0].get("id")
    row = _stamp_org(_clean(REPORT_FIELDS, body), caller)
    row["property_id"] = property_id
    row["created_by"] = claims_subject(token)
    rows = _req("POST", "cm_reports", body=row, prefer="return=representation", token=token)
    return (rows or [{}])[0]


def update_report(report_id: str, body: dict, token: str | None = None, caller=None) -> dict:
    row = _clean(REPORT_FIELDS, body)
    rows = _req("PATCH", "cm_reports", {"id": f"eq.{report_id}", **_org_params(caller)}, body=row,
                prefer="return=representation", token=token)
    if not rows:
        raise CMError(404, "report not found")
    # keep the shared-job deliverable's status in step so the Hub job view
    # reflects the real lifecycle (ready -> delivered etc.), best-effort
    if row.get("status") in ("ready", "delivered"):
        try:
            _req("PATCH", "crm_deliverables",
                 {"cm_report_id": f"eq.{report_id}", **_org_params(caller)},
                 body={"status": row["status"]}, token=token)
        except CMError:
            pass
    return rows[0]


def delete_report(report_id: str, token: str | None = None, caller=None) -> None:
    _req("DELETE", "cm_reports", {"id": f"eq.{report_id}", **_org_params(caller)}, token=token)


# ---- requirements ----------------------------------------------------------
def _parent_report(report_id: str, token: str | None, caller) -> dict:
    """Fetch the parent report org-scoped — 404s if it isn't the caller's."""
    rows = _req("GET", "cm_reports", {"select": "id,org_id", "id": f"eq.{report_id}",
                                      "limit": "1", **_org_params(caller)}, token=token) or []
    if not rows:
        raise CMError(404, "report not found")
    return rows[0]


def add_requirement(body: dict, token: str | None = None, caller=None) -> dict:
    if not (body or {}).get("report_id") or not (body or {}).get("requirement"):
        raise CMError(400, "report_id and requirement are required")
    parent = _parent_report(body["report_id"], token, caller)
    row = _clean(REQ_FIELDS, body)
    if parent.get("org_id"):
        row["org_id"] = parent["org_id"]
    rows = _req("POST", "cm_requirements", body=row, prefer="return=representation", token=token)
    return (rows or [{}])[0]


def add_requirements(report_id: str, rows: list, token: str | None = None, caller=None) -> list:
    """Bulk-insert requirement rows (cm_requirements-shaped dicts) onto a report."""
    if not report_id:
        raise CMError(400, "report_id is required")
    parent = _parent_report(report_id, token, caller)
    payload = []
    for r in rows or []:
        if not (r or {}).get("requirement"):
            continue
        row = _clean(REQ_FIELDS, r)
        row["report_id"] = report_id
        if parent.get("org_id"):
            row["org_id"] = parent["org_id"]
        payload.append(row)
    if not payload:
        return []
    # PostgREST bulk inserts require identical keys on every row (PGRST102) —
    # normalize to the union, padding absent fields with None
    all_keys = set().union(*(row.keys() for row in payload))
    payload = [{k: row.get(k) for k in all_keys} for row in payload]
    return _req("POST", "cm_requirements", body=payload,
                prefer="return=representation", token=token) or []


def update_requirement(req_id: str, body: dict, token: str | None = None, caller=None) -> dict:
    row = _clean(REQ_FIELDS, body)
    row.pop("report_id", None)  # a requirement can't be moved to another report
    if not row:
        raise CMError(400, "no editable fields in body")
    rows = _req("PATCH", "cm_requirements", {"id": f"eq.{req_id}", **_org_params(caller)},
                body=row, prefer="return=representation", token=token)
    if not rows:
        raise CMError(404, "requirement not found")
    return rows[0]


def delete_requirement(req_id: str, token: str | None = None, caller=None) -> None:
    _req("DELETE", "cm_requirements", {"id": f"eq.{req_id}", **_org_params(caller)}, token=token)


# ---- jurisdiction adoption reference (read-only: cm_state_adoptions etc.) ---
# Public-coverage projection: ONLY gating-safe columns ever leave Supabase for
# the unauthenticated /api/public/coverage surface — edition/code strings,
# sources, and amendment detail are never even fetched (William's standing
# rule; _teaser_payload in serve.py is the reference implementation).
COVERAGE_COLUMNS = "state_abbr,state_name,confidence,verified_at"


def list_state_coverage() -> list:
    """All cm_state_adoptions rows, coverage-safe columns only (service key —
    this feeds the UNAUTHENTICATED public coverage endpoint)."""
    return _req("GET", "cm_state_adoptions",
                {"select": COVERAGE_COLUMNS, "order": "state_abbr.asc"}) or []


def list_state_adoptions(token: str | None = None) -> list:
    """All cm_state_adoptions rows for SIGNED-IN, entitled callers — full rows
    minus the research-provenance `sources` arrays (those stay internal even on
    the authed API; ship a source_count instead)."""
    rows = _req("GET", "cm_state_adoptions",
                {"select": "*", "order": "state_abbr.asc"}, token=token) or []
    for r in rows:
        sources = r.pop("sources", None)
        r["source_count"] = len(sources) if isinstance(sources, list) else 0
    return rows


def get_state_adoption(state_abbr: str | None, token: str | None = None) -> dict | None:
    if not state_abbr:
        return None
    rows = _req("GET", "cm_state_adoptions",
                {"select": "*", "state_abbr": f"eq.{state_abbr.strip().upper()}", "limit": "1"},
                token=token) or []
    return rows[0] if rows else None


def get_local_adoptions(state_abbr: str | None, fips_list: list | None = None,
                        token: str | None = None) -> list:
    if not state_abbr:
        return []
    params = {"select": "*", "state_abbr": f"eq.{state_abbr.strip().upper()}"}
    fips = [f for f in (fips_list or []) if f]
    if fips:
        params["fips"] = f"in.({','.join(fips)})"
    return _req("GET", "cm_local_adoptions", params, token=token) or []


# ---- per-discipline adoptions (mechanical/electrical/plumbing) -------------
def _best_discipline_row(rows: list[dict], county_fips: str | None,
                         place_fips: str | None) -> dict | None:
    """Most-specific verified adoption: place match > county match > state.
    Rows are already filtered to one (state, discipline)."""
    def rank(r: dict) -> int:
        if r.get("level") == "place" and place_fips and r.get("place_fips") == place_fips:
            return 3
        if r.get("level") == "county" and county_fips and r.get("county_fips") == county_fips:
            return 2
        if r.get("level") == "state":
            return 1
        return 0
    candidates = [(rank(r), r) for r in rows]
    candidates = [(k, r) for k, r in candidates if k > 0]
    if not candidates:
        return None
    candidates.sort(key=lambda kr: kr[0], reverse=True)
    return candidates[0][1]


def get_discipline_adoptions(state_abbr: str | None, discipline: str,
                             token: str | None = None) -> list[dict]:
    """All cm_discipline_adoptions rows for a (state, discipline). Empty list
    when unconfigured/missing — callers degrade to AHJ-confirm, never raise."""
    if not state_abbr:
        return []
    try:
        return _req("GET", "cm_discipline_adoptions", {
            "select": "*",
            "state_abbr": f"eq.{state_abbr}",
            "discipline": f"eq.{discipline}",
        }, token=token) or []
    except (CMNotConfigured, CMError):
        return []


# ---- deliverable linkage (shows the report on the shared job) --------------
def attach_deliverable(report: dict, job_id: str, file_url: str, token: str | None = None,
                       caller=None) -> dict:
    payload = {
        "property_id": report.get("property_id"),
        "cm_report_id": report.get("id"),
        "product": "codesandmore",
        "kind": "code_report",
        "status": "ready",
        "label": "Ordinance-or-Law Report",
        "job_id": job_id,
        "file_url": file_url,
    }
    # the deliverable belongs to the report's org (not the caller's primary org —
    # a platform admin may be generating on another org's behalf)
    if report.get("org_id"):
        payload["org_id"] = report["org_id"]
    else:
        payload = _stamp_org(payload, caller)
    existing = _req("GET", "crm_deliverables",
                    {"select": "id", "cm_report_id": f"eq.{report.get('id')}", "limit": "1",
                     **_org_params(caller)}, token=token) or []
    if existing:
        _req("PATCH", "crm_deliverables", {"id": f"eq.{existing[0]['id']}"}, body=payload, token=token)
        return {"id": existing[0]["id"], **payload}
    rows = _req("POST", "crm_deliverables", body=payload, prefer="return=representation", token=token)
    return (rows or [{}])[0]


if __name__ == "__main__":
    rows = [
        {"level": "state",  "state_abbr": "IL", "county_fips": None, "place_fips": None,
         "discipline": "electrical", "code": "NEC", "edition": "2017", "confidence": "high"},
        {"level": "county", "state_abbr": "IL", "county_fips": "17073", "place_fips": None,
         "discipline": "electrical", "code": "NEC", "edition": "2020", "confidence": "high"},
    ]
    best = _best_discipline_row(rows, county_fips="17073", place_fips=None)
    assert best["edition"] == "2020" and best["level"] == "county", best
    best_state = _best_discipline_row(rows, county_fips="99999", place_fips=None)
    assert best_state["level"] == "state", best_state
    assert _best_discipline_row([], county_fips=None, place_fips=None) is None
    print("cmdata discipline-row selection OK")
