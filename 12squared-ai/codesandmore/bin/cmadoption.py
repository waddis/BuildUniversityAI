#!/usr/bin/env python3
"""Resolve a trade's adopted code+edition for a jurisdiction, per discipline.

Granular to the jurisdiction: most-specific VERIFIED adoption wins
(place > county > state). No verified row at any level -> ahj_confirm sentinel:
the trade still renders its requirements keyed to a reference edition the UI/PDF
labels "edition adopted per AHJ — confirm locally", never asserting a year we
have not read. Stdlib-only; the DB fetch lives in cmdata.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import cmdata


def resolve_from_rows(discipline: str, stack: dict, rows: list[dict]) -> dict:
    """Pure resolver over already-fetched rows (testable without the DB)."""
    best = cmdata._best_discipline_row(
        rows, stack.get("county_fips"), stack.get("place_fips"))
    if not best:
        return {"discipline": discipline, "code": None, "edition": None,
                "verified_at": None, "source_url": None, "confidence": None,
                "level": None, "ahj_confirm": True}
    return {"discipline": discipline,
            "code": best.get("code"), "edition": best.get("edition"),
            "verified_at": best.get("verified_at"), "source_url": best.get("source_url"),
            "confidence": best.get("confidence"), "level": best.get("level"),
            "ahj_confirm": False}


def resolve(discipline: str, stack: dict, token: str | None = None) -> dict:
    """Fetch + resolve. Never raises — degrades to ahj_confirm."""
    rows = cmdata.get_discipline_adoptions(stack.get("state_abbr"), discipline, token=token)
    return resolve_from_rows(discipline, stack, rows)


if __name__ == "__main__":
    stack = {"state_abbr": "IL", "county_fips": "17073", "place_fips": "17xxxxx"}
    rows = [{"level": "state", "state_abbr": "IL", "county_fips": None, "place_fips": None,
             "discipline": "electrical", "code": "NEC", "edition": "2017",
             "verified_at": "2026-06-09", "source_url": "https://x", "confidence": "high"}]
    res = resolve_from_rows("electrical", stack, rows)
    assert res["code"] == "NEC" and res["edition"] == "2017" and res["ahj_confirm"] is False
    assert res["level"] == "state"
    empty = resolve_from_rows("electrical", stack, [])
    assert empty["ahj_confirm"] is True and empty["edition"] is None
    print(f"cmadoption OK — resolved {res['code']} {res['edition']} ({res['level']}); empty -> ahj_confirm")
