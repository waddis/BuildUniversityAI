#!/usr/bin/env python3
"""Build a ZIP(ZCTA) -> primary county-FIPS crosswalk from the authoritative
public-domain US Census 2020 ZCTA-to-County relationship file.

Source (public domain, no key):
  https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/tab20_zcta520_county20_natl.txt

A ZCTA can overlap multiple counties; we keep the county with the largest land
overlap (AREALAND_PART) as the primary, which is what a bare ZIP should resolve
to. Output is a compact JSON consumed by jurisdiction.py for ZIP-only inputs.

Run: python3 bin/build_zcta_crosswalk.py
Writes: data/research/zcta_county_crosswalk.json
Stdlib only; downloads the source once.
"""
from __future__ import annotations

import json
import urllib.request
from pathlib import Path

SOURCE = ("https://www2.census.gov/geo/docs/maps-data/data/rel2020/"
          "zcta520/tab20_zcta520_county20_natl.txt")
OUT = Path(__file__).resolve().parent.parent / "data" / "research" / "zcta_county_crosswalk.json"

# Pipe-delimited columns (0-indexed) in the relationship file.
C_ZCTA = 1          # GEOID_ZCTA5_20
C_COUNTY = 9        # GEOID_COUNTY_20
C_COUNTY_NAME = 10  # NAMELSAD_COUNTY_20
C_AREA_PART = 16    # AREALAND_PART (overlap land area)


def build() -> dict:
    print(f"downloading {SOURCE} ...")
    req = urllib.request.Request(SOURCE, headers={"User-Agent": "codesandmore-crosswalk/1.0"})
    with urllib.request.urlopen(req, timeout=120) as r:
        raw = r.read().decode("utf-8-sig", errors="replace")
    lines = raw.splitlines()
    header = lines[0].split("|")
    assert header[C_ZCTA] == "GEOID_ZCTA5_20", header[C_ZCTA]
    assert header[C_COUNTY] == "GEOID_COUNTY_20", header[C_COUNTY]
    assert header[C_AREA_PART] == "AREALAND_PART", header[C_AREA_PART]

    # zcta -> (best_area, county_fips, county_name)
    best: dict[str, tuple[int, str, str]] = {}
    rows = 0
    for line in lines[1:]:
        f = line.split("|")
        if len(f) <= C_AREA_PART:
            continue
        zcta, county = f[C_ZCTA].strip(), f[C_COUNTY].strip()
        if not zcta or not county:   # county-only / zcta-only relationship parts
            continue
        try:
            area = int(f[C_AREA_PART] or "0")
        except ValueError:
            area = 0
        rows += 1
        cur = best.get(zcta)
        if cur is None or area > cur[0]:
            best[zcta] = (area, county, f[C_COUNTY_NAME].strip())

    crosswalk = {z: {"county_fips": c, "county_name": n} for z, (a, c, n) in best.items()}
    print(f"parsed {rows} zcta-county parts -> {len(crosswalk)} distinct ZIPs")
    return crosswalk


if __name__ == "__main__":
    data = build()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "_meta": {
            "source": SOURCE,
            "description": "ZIP(ZCTA) -> primary county FIPS, US Census 2020 ZCTA-to-County "
                           "relationship file (public domain). Primary = largest land overlap.",
            "zips": len(data),
        },
        "crosswalk": data,
    }
    OUT.write_text(json.dumps(payload, separators=(",", ":")))
    print(f"wrote {OUT} ({OUT.stat().st_size // 1024} KB)")
    # sanity: a couple of known ZIPs
    for z in ("62401", "17101", "33756"):
        print(f"  {z} -> {data.get(z)}")
