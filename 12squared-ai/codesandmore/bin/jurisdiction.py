#!/usr/bin/env python3
"""Codes&More — jurisdiction resolver.

resolve(address, zip5) -> flat dict identifying the governing-jurisdiction stack
(state -> county -> place) for a US street address or bare 5-digit ZIP.

Primary: US Census Geocoder (free, key-less, stdlib urllib, 10s timeout) per
data/research/jurisdiction_resolution.md — geographies/onelineaddress with
benchmark=Public_AR_Current, vintage=Current_Current.

Fallbacks (graceful degradation, never raises on network failure):
  1. HUD-USPS zip-county crosswalk API (only if HUD_API_TOKEN env var is set) —
     resolution_method='zip_crosswalk'.
  2. Embedded ZIP-prefix -> state table (offline) — resolution_method='state_only'.

The stack identifies AHJ *candidates*; which office actually enforces the code is
state-specific. Nothing here is a legal determination.
"""
from __future__ import annotations

import json
import json
import os
import re
import threading
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

GEOCODER_BASE = "https://geocoding.geo.census.gov/geocoder"
BENCHMARK = "Public_AR_Current"
VINTAGE = "Current_Current"
LAYERS = "States,Counties,County Subdivisions,Incorporated Places,Census Designated Places"
TIMEOUT = 10  # seconds

# Datacenter-friendly geocoding fallback. The Census geocoder's WAF rejects
# cloud/datacenter IPs (returns an HTML "Request Rejected" page), so on the VPS
# we resolve via Nominatim (OSM, address -> lat/lon) + the FCC Census Area API
# (lat/lon -> county FIPS). County-level, address-derived (precise); no
# incorporated-place FIPS is available from these sources.
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
FCC_AREA_URL = "https://geo.fcc.gov/api/census/area"
GEO_UA = "codesandmore/1.0 (+https://buildingcodes.app)"

STATE_NAMES = {
    "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas",
    "CA": "California", "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware",
    "DC": "District of Columbia", "FL": "Florida", "GA": "Georgia", "HI": "Hawaii",
    "ID": "Idaho", "IL": "Illinois", "IN": "Indiana", "IA": "Iowa",
    "KS": "Kansas", "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine",
    "MD": "Maryland", "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota",
    "MS": "Mississippi", "MO": "Missouri", "MT": "Montana", "NE": "Nebraska",
    "NV": "Nevada", "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico",
    "NY": "New York", "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio",
    "OK": "Oklahoma", "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island",
    "SC": "South Carolina", "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas",
    "UT": "Utah", "VT": "Vermont", "VA": "Virginia", "WA": "Washington",
    "WV": "West Virginia", "WI": "Wisconsin", "WY": "Wyoming",
    "PR": "Puerto Rico", "VI": "U.S. Virgin Islands", "GU": "Guam",
    "AS": "American Samoa", "MP": "Northern Mariana Islands",
}

# Embedded ZIP-prefix (first 3 digits) -> state ranges for offline degradation.
# Specific-prefix exceptions are checked before the ranges.
_ZIP_PREFIX_EXCEPTIONS = {
    "005": "NY", "055": "MA", "063": "CT", "096": "AE", "201": "VA",
    "398": "GA", "399": "GA", "733": "TX", "885": "TX",
}
_ZIP_PREFIX_RANGES = [
    (6, 7, "PR"), (8, 8, "VI"), (9, 9, "PR"),
    (10, 27, "MA"), (28, 29, "RI"), (30, 38, "NH"), (39, 49, "ME"),
    (50, 59, "VT"), (60, 69, "CT"), (70, 89, "NJ"),
    (100, 149, "NY"), (150, 196, "PA"), (197, 199, "DE"),
    (200, 200, "DC"), (202, 205, "DC"), (206, 219, "MD"),
    (220, 246, "VA"), (247, 269, "WV"), (270, 289, "NC"), (290, 299, "SC"),
    (300, 319, "GA"), (320, 349, "FL"), (350, 369, "AL"),
    (370, 385, "TN"), (386, 397, "MS"),
    (400, 427, "KY"), (430, 459, "OH"), (460, 479, "IN"), (480, 499, "MI"),
    (500, 528, "IA"), (530, 549, "WI"), (550, 567, "MN"),
    (570, 577, "SD"), (580, 588, "ND"), (590, 599, "MT"),
    (600, 629, "IL"), (630, 658, "MO"), (660, 679, "KS"), (680, 693, "NE"),
    (700, 715, "LA"), (716, 729, "AR"), (730, 749, "OK"), (750, 799, "TX"),
    (800, 816, "CO"), (820, 831, "WY"), (832, 839, "ID"), (840, 847, "UT"),
    (850, 865, "AZ"), (870, 884, "NM"), (889, 899, "NV"),
    (900, 961, "CA"), (967, 968, "HI"), (969, 969, "GU"),
    (970, 979, "OR"), (980, 994, "WA"), (995, 999, "AK"),
]


def _empty_result() -> dict:
    return {
        "state_abbr": None, "state_name": None,
        "county_fips": None, "county_name": None,
        "place_fips": None, "place_name": None, "place_type": None,
        "unincorporated": False,
        "resolution_method": None,
        "lat": None, "lon": None,
    }


def _http_json(url: str, headers: dict | None = None) -> dict | None:
    """GET url, parse JSON. Returns None on any network/parse failure."""
    req = urllib.request.Request(url, headers={"User-Agent": "codesandmore-jurisdiction/1.0",
                                               **(headers or {})})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError, OSError,
            ValueError, json.JSONDecodeError):
        return None


def _zip_prefix_state(zip5: str) -> str | None:
    if not zip5 or not re.fullmatch(r"\d{5}", zip5):
        return None
    prefix = zip5[:3]
    if prefix in _ZIP_PREFIX_EXCEPTIONS:
        abbr = _ZIP_PREFIX_EXCEPTIONS[prefix]
        return abbr if abbr in STATE_NAMES else None
    p = int(prefix)
    for lo, hi, abbr in _ZIP_PREFIX_RANGES:
        if lo <= p <= hi:
            return abbr
    return None


def _extract_zip(address: str | None) -> str | None:
    if not address:
        return None
    m = re.search(r"\b(\d{5})(?:-\d{4})?\s*$", address.strip())
    return m.group(1) if m else None


def _extract_state(address: str | None) -> str | None:
    """Pull a USPS state code from the tail of an address string (e.g. the 'PA'
    in '100 N Main St, Harrisburg, PA' or '..., PA 17101'). Used only as a last
    resort when geocoding misses and there's no ZIP — better an honest
    state-level resolution than all-null."""
    if not address:
        return None
    # token before an optional trailing ZIP, e.g. ", PA" or ", PA 17101"
    m = re.search(r"[,\s]([A-Za-z]{2})\b(?:\s+\d{5}(?:-\d{4})?)?\s*$",
                  address.strip())
    if not m:
        return None
    abbr = m.group(1).upper()
    return abbr if abbr in STATE_NAMES else None


def _census_geocode(address: str) -> dict | None:
    """Census geocoder onelineaddress -> resolved dict, or None on failure/no match."""
    qs = urllib.parse.urlencode({
        "address": address,
        "benchmark": BENCHMARK,
        "vintage": VINTAGE,
        "layers": LAYERS,
        "format": "json",
    })
    data = _http_json(f"{GEOCODER_BASE}/geographies/onelineaddress?{qs}")
    if not data:
        return None
    matches = (data.get("result") or {}).get("addressMatches") or []
    if not matches:
        return None
    match = matches[0]
    geos = match.get("geographies") or {}

    def first(layer: str) -> dict:
        rows = geos.get(layer) or []
        return rows[0] if rows else {}

    state = first("States")
    county = first("Counties")
    inc_place = first("Incorporated Places")
    cdp = first("Census Designated Places")
    cousub = first("County Subdivisions")

    out = _empty_result()
    out["resolution_method"] = "census_geocoder"
    out["state_abbr"] = state.get("STUSAB")
    out["state_name"] = state.get("NAME") or STATE_NAMES.get(state.get("STUSAB") or "")
    out["county_fips"] = county.get("GEOID")
    out["county_name"] = county.get("NAME")

    coords = match.get("coordinates") or {}
    try:
        out["lat"] = float(coords.get("y")) if coords.get("y") is not None else None
        out["lon"] = float(coords.get("x")) if coords.get("x") is not None else None
    except (TypeError, ValueError):
        pass

    # Rank AHJ candidates: active incorporated place > active MCD/county sub >
    # CDP (unincorporated) > county only (unincorporated). Trust per-entity FUNCSTAT.
    cousub_active = cousub.get("FUNCSTAT") == "A"
    if inc_place:
        out["place_fips"] = inc_place.get("GEOID")
        out["place_name"] = inc_place.get("NAME")
        out["place_type"] = "incorporated_place"
        out["unincorporated"] = False
    elif cousub_active:
        out["place_fips"] = cousub.get("GEOID")
        out["place_name"] = cousub.get("NAME")
        out["place_type"] = "county_subdivision"
        out["unincorporated"] = False
    elif cdp:
        out["place_fips"] = cdp.get("GEOID")
        out["place_name"] = cdp.get("NAME")
        out["place_type"] = "census_designated_place"
        out["unincorporated"] = True
    else:
        out["unincorporated"] = True
    return out


def _nominatim_fcc_geocode(address: str) -> dict | None:
    """Address -> county jurisdiction via Nominatim (OSM) + the FCC Census Area
    API. Datacenter-friendly fallback for the WAF-blocked Census geocoder.
    Resolves to county-level (address-derived, precise); the city name is carried
    for transparency but no authoritative incorporated-place FIPS is available
    from these sources, so place_fips stays null."""
    qs = urllib.parse.urlencode({"q": address, "format": "json", "limit": 1,
                                 "addressdetails": 1})
    nom = _http_json(f"{NOMINATIM_URL}?{qs}", headers={"User-Agent": GEO_UA})
    if not nom or not isinstance(nom, list):
        return None
    top = nom[0]
    try:
        lat, lon = float(top.get("lat")), float(top.get("lon"))
    except (TypeError, ValueError):
        return None
    fcc = _http_json(f"{FCC_AREA_URL}?{urllib.parse.urlencode({'lat': lat, 'lon': lon, 'format': 'json'})}")
    results = (fcc or {}).get("results") or []
    if not results:
        return None
    r = results[0]
    county_fips = str(r.get("county_fips") or "")
    if len(county_fips) != 5:
        return None
    abbr = (r.get("state_code") or "").upper() or None
    addr = top.get("address") or {}
    out = _empty_result()
    out["resolution_method"] = "nominatim_fcc"
    out["state_abbr"] = abbr
    out["state_name"] = STATE_NAMES.get(abbr or "") or r.get("state_name")
    out["county_fips"] = county_fips
    out["county_name"] = r.get("county_name")
    out["lat"], out["lon"] = lat, lon
    # OSM locality name for transparency only — never an authoritative place FIPS.
    out["place_name"] = (addr.get("city") or addr.get("town")
                         or addr.get("village") or addr.get("hamlet"))
    out["place_type"] = "osm_locality" if out["place_name"] else None
    out["unincorporated"] = False
    return out


def _hud_zip_county(zip5: str) -> dict | None:
    """HUD-USPS zip-county crosswalk (type 2). Needs HUD_API_TOKEN; else None."""
    token = os.environ.get("HUD_API_TOKEN", "").strip()
    if not token:
        return None
    qs = urllib.parse.urlencode({"type": 2, "query": zip5})
    data = _http_json(f"https://www.huduser.gov/hudapi/public/usps?{qs}",
                      headers={"Authorization": f"Bearer {token}"})
    if not data:
        return None
    rows = ((data.get("data") or {}).get("results")) or []
    if not rows:
        return None
    top = max(rows, key=lambda r: float(r.get("res_ratio") or 0))
    geoid = str(top.get("geoid") or "")
    if len(geoid) != 5:
        return None
    abbr = top.get("state") or _zip_prefix_state(zip5)
    out = _empty_result()
    out["resolution_method"] = "zip_crosswalk"
    out["state_abbr"] = abbr
    out["state_name"] = STATE_NAMES.get(abbr or "")
    out["county_fips"] = geoid
    # HUD returns USPS preferred city, not the county name — never fabricate one,
    # and never fabricate a place from a ZIP (no ZIP->place crosswalk exists).
    out["county_name"] = None
    out["unincorporated"] = False
    return out


_CROSSWALK_PATH = (Path(__file__).resolve().parent.parent
                   / "data" / "research" / "zcta_county_crosswalk.json")
_crosswalk: dict | None = None
_crosswalk_lock = threading.Lock()


def _load_crosswalk() -> dict:
    """Bundled US Census 2020 ZCTA->primary-county crosswalk (read once)."""
    global _crosswalk
    if _crosswalk is None:
        with _crosswalk_lock:
            if _crosswalk is None:
                try:
                    with open(_CROSSWALK_PATH, encoding="utf-8") as f:
                        _crosswalk = (json.load(f) or {}).get("crosswalk") or {}
                except (OSError, ValueError):
                    _crosswalk = {}
    return _crosswalk


def _zcta_county(zip5: str) -> dict | None:
    """Resolve a bare ZIP to its primary county via the bundled, public-domain
    Census ZCTA->county crosswalk (no API key, always available). No authoritative
    ZIP->place crosswalk exists, so place stays null — a street address is needed
    for place-level resolution; never fabricate a place from a ZIP."""
    rec = _load_crosswalk().get(zip5)
    if not rec or not rec.get("county_fips"):
        return None
    abbr = _zip_prefix_state(zip5)
    out = _empty_result()
    out["resolution_method"] = "zcta_county_crosswalk"
    out["state_abbr"] = abbr
    out["state_name"] = STATE_NAMES.get(abbr or "")
    out["county_fips"] = str(rec["county_fips"])
    out["county_name"] = rec.get("county_name")
    out["unincorporated"] = False
    return out


def _state_only(zip5: str | None) -> dict:
    out = _empty_result()
    abbr = _zip_prefix_state(zip5 or "")
    out["state_abbr"] = abbr
    out["state_name"] = STATE_NAMES.get(abbr or "")
    out["resolution_method"] = "state_only"
    return out


def resolve(address: str | None = None, zip5: str | None = None) -> dict:
    """Resolve a street address and/or bare ZIP to a jurisdiction stack.

    Never raises on network failure — degrades census_geocoder -> zip_crosswalk
    (HUD, token-gated) -> state_only (embedded ZIP-prefix table).
    """
    address = (address or "").strip() or None
    zip5 = (zip5 or "").strip() or None
    if zip5:
        m = re.match(r"^(\d{5})", zip5)
        zip5 = m.group(1) if m else None
    if not zip5:
        zip5 = _extract_zip(address)

    if address:
        result = _census_geocode(address)        # residential IPs (dev Mac)
        if result:
            return result
        result = _nominatim_fcc_geocode(address)  # datacenter fallback (prod VPS)
        if result:
            return result

    if zip5:
        # HUD (token-gated, residential-ratio weighting) is the more precise
        # secondary when a ZIP spans counties; the bundled Census ZCTA crosswalk
        # is the always-available primary fallback (no key, works offline).
        result = _hud_zip_county(zip5)
        if result:
            return result
        result = _zcta_county(zip5)
        if result:
            return result

    if zip5:
        return _state_only(zip5)

    # No geocode, no ZIP: salvage at least the state from the address string
    # rather than returning an all-null jurisdiction.
    abbr = _extract_state(address)
    if abbr:
        out = _empty_result()
        out["state_abbr"] = abbr
        out["state_name"] = STATE_NAMES.get(abbr)
        out["resolution_method"] = "state_from_address"
        return out

    return _state_only(zip5)


if __name__ == "__main__":
    import sys

    args = sys.argv[1:] or ["1600 Pennsylvania Ave NW, Washington, DC 20500"]
    for arg in args:
        if re.fullmatch(r"\d{5}(-\d{4})?", arg.strip()):
            stack = resolve(address=None, zip5=arg.strip())
        else:
            stack = resolve(address=arg)
        print(f"== {arg}")
        print(json.dumps(stack, indent=2))
