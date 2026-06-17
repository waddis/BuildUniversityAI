#!/usr/bin/env python3
"""Structural + link audit for the per-trade requirement libraries.

Structural mode (default): every entry across every trade library carries a
pinpoint section, a title, a summary, a source URL, a confidence, and a
determinable verified date; each library file has a _meta block; no edition key
is malformed. Exit non-zero on any violation so it can gate releases.

Field-name reality (matches cmlibrary's normalization): the source URL may be
under 'source_url' or 'source'; the verified date may be on the entry
('verified_at') or inherited from the file's _meta.generated. An entry is only
flagged when it genuinely lacks a citation, not for naming.

Link mode (--links): additionally GET each distinct source URL and flag any that
no longer resolve. Network, opt-in.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import cmlibrary

VALID_CONFIDENCE = {"high", "medium", "low"}


def _entry_source(entry: dict) -> str:
    return str(entry.get("source_url") or entry.get("source") or entry.get("citation") or "").strip()


def _entry_verified(entry: dict, meta_generated: str) -> str:
    return str(entry.get("verified_at") or meta_generated or "").strip()


def _audit_trade(trade: str) -> list[str]:
    problems: list[str] = []
    lib = cmlibrary._load(trade)
    meta = lib.get("_meta") or {}
    if not meta:
        problems.append(f"{trade}: missing _meta block")
    meta_generated = str(meta.get("generated") or "")
    for edition_key, groups in lib.items():
        if edition_key in ("_meta", "federal"):
            # federal is a flat list, not edition->groups; audit it too
            if edition_key == "federal":
                for e in groups:
                    problems += _audit_entry(trade, "federal", "federal", e, meta_generated)
            continue
        if "-" not in edition_key:
            problems.append(f"{trade}: malformed edition key {edition_key!r}")
            continue
        for category, entries in groups.items():
            for e in entries:
                problems += _audit_entry(trade, edition_key, category, e, meta_generated)
    return problems


def _audit_entry(trade: str, edition_key: str, category: str, e: dict,
                 meta_generated: str) -> list[str]:
    problems: list[str] = []
    where = f"{trade}/{edition_key}/{category}"
    label = e.get("section") or e.get("citation") or e.get("title") or "?"
    # federal entries use 'citation' as their pinpoint; code entries use 'section'
    if not str(e.get("section") or e.get("citation") or "").strip():
        problems.append(f"{where}: entry {label!r} missing section/citation")
    if not str(e.get("title") or "").strip():
        problems.append(f"{where}: entry {label!r} missing title")
    if not str(e.get("summary") or "").strip():
        problems.append(f"{where}: entry {label!r} missing summary")
    if not _entry_source(e):
        problems.append(f"{where}: entry {label!r} missing source URL")
    if not _entry_verified(e, meta_generated):
        problems.append(f"{where}: entry {label!r} has no verified date (entry.verified_at or _meta.generated)")
    conf = e.get("confidence")
    if not conf:
        problems.append(f"{where}: entry {label!r} missing confidence")
    elif conf not in VALID_CONFIDENCE:
        problems.append(f"{where}: entry {label!r} bad confidence {conf!r}")
    return problems


def audit_all() -> list[str]:
    problems: list[str] = []
    for trade in cmlibrary.trades():
        problems.extend(_audit_trade(trade))
    return problems


def check_links() -> list[str]:
    import urllib.request
    seen: set[str] = set()
    problems: list[str] = []
    for trade in cmlibrary.trades():
        lib = cmlibrary._load(trade)
        for edition_key, groups in lib.items():
            if edition_key == "_meta":
                continue
            entry_lists = [groups] if edition_key == "federal" else list(groups.values())
            for entries in entry_lists:
                for e in entries:
                    url = _entry_source(e)
                    if not url or url in seen:
                        continue
                    seen.add(url)
                    try:
                        req = urllib.request.Request(url, method="GET",
                                                     headers={"User-Agent": "codesandmore-audit"})
                        with urllib.request.urlopen(req, timeout=15) as r:
                            if r.status >= 400:
                                problems.append(f"{trade}: {url} -> HTTP {r.status}")
                    except Exception as ex:  # noqa: BLE001
                        problems.append(f"{trade}: {url} -> {ex}")
    return problems


if __name__ == "__main__":
    import sys
    problems = audit_all()
    if "--links" in sys.argv:
        problems += check_links()
    for p in problems:
        print("FAIL:", p)
    print(f"audit_library: {len(problems)} problem(s) across trades={cmlibrary.trades()}")
    sys.exit(1 if problems else 0)
