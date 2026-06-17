#!/usr/bin/env python3
"""Trade taxonomy for Codes&More trade-specific reports.

A "trade" is what the user selects on a report. Each trade maps to a code-
adoption DISCIPLINE (which adopted edition governs it) and to the code
family/chapters it draws from. Disciplines are adopted by jurisdictions on
separate cycles, so a trade's edition is resolved via cmadoption, not assumed
from the building code. Stdlib-only, no I/O.
"""
from __future__ import annotations

# federal: whether the fixed federal layer (EPA RRP, OSHA, NFIP, asbestos)
# applies to this trade's reports. code_prefixes: library edition-key prefixes
# this trade may resolve to (e.g. "IRC-2021", "NEC-2020").
TRADES = [
    {"id": "roofing",    "label": "Roofing",                  "discipline": "building",
     "code_prefixes": ["IRC", "IBC"], "federal": True},
    {"id": "exterior",   "label": "Exterior / Siding / Windows", "discipline": "building",
     "code_prefixes": ["IRC", "IBC"], "federal": True},
    {"id": "mechanical", "label": "Mechanical / HVAC",        "discipline": "mechanical",
     "code_prefixes": ["IMC", "IRC"], "federal": False},
    {"id": "electrical", "label": "Electrical",               "discipline": "electrical",
     "code_prefixes": ["NEC"], "federal": False},
    {"id": "plumbing",   "label": "Plumbing",                 "discipline": "plumbing",
     "code_prefixes": ["IPC", "UPC", "IRC"], "federal": False},
]

_BY_ID = {t["id"]: t for t in TRADES}


def trade(trade_id: str) -> dict:
    """The trade record for an id. Raises KeyError if unknown."""
    return _BY_ID[trade_id]


def disciplines() -> set[str]:
    """All distinct adoption disciplines across trades."""
    return {t["discipline"] for t in TRADES}


if __name__ == "__main__":
    ids = [t["id"] for t in TRADES]
    assert ids == ["roofing", "exterior", "mechanical", "electrical", "plumbing"], ids
    assert trade("roofing")["discipline"] == "building"
    assert trade("electrical")["discipline"] == "electrical"
    assert trade("exterior")["discipline"] == "building"
    assert trade("roofing")["federal"] is True
    assert trade("electrical")["federal"] is False
    assert disciplines() == {"building", "mechanical", "electrical", "plumbing"}
    assert trade("electrical")["code_prefixes"] == ["NEC"]
    assert "IRC" in trade("roofing")["code_prefixes"]
    try:
        trade("nonsense"); assert False, "expected KeyError"
    except KeyError:
        pass
    print(f"trades.py OK — {len(TRADES)} trades, disciplines={sorted(disciplines())}")
