#!/usr/bin/env python3
"""cmlibrary — edition-keyed roofing requirements library for Codes&More.

Loads data/research/requirements_library.json once and maps its entries into
cm_requirements-shaped dicts (category, code_source, section, requirement,
trigger, sort_order [, notes]) for bulk insertion onto a report.

Legal posture (data/research/legal_posture.md):
  - All requirement text is a PARAPHRASED summary plus a pinpoint citation —
    never verbatim model-code text. Do not alter summaries to quote code text.
  - Every consumer (report PDF, API response) must surface LIBRARY_DISCLAIMERS.
  - code_source identifies the code and edition nominatively in plain text
    (e.g. 'IRC 2021'); never render SDO logos or cover art.
  - Only the edition a jurisdiction actually adopted should be cited; the
    nearest-OLDER-edition fallback below exists so we never serve text from a
    NEWER (unadopted) edition, which would be fully copyrighted unadopted text.

Stdlib-only. No network access.
"""

from __future__ import annotations

import json
import re
import threading
from pathlib import Path

# Repo layout: codesandmore/bin/cmlibrary.py -> codesandmore/data/research/...
# Per-trade libraries live at data/research/library/<trade>.json. roofing is the
# default trade so callers predating the trade dimension keep working.
LIBRARY_DIR = (
    Path(__file__).resolve().parent.parent
    / "data" / "research" / "library"
)
DEFAULT_TRADE = "roofing"
HAZARD_CONDITIONS_PATH = (
    Path(__file__).resolve().parent.parent
    / "data" / "research" / "hazard_conditions.json"
)

# Required on every generated report and API response that includes library
# content (legal_posture.md section 3 — include ALL of these).
LIBRARY_DISCLAIMERS = [
    # 1. AHJ verification
    "Code requirements summarized here are for reference only. Always verify "
    "current requirements with the local Authority Having Jurisdiction (AHJ) "
    "before design, bidding, repair, or claim decisions. Local amendments may "
    "modify or delete any provision shown.",
    # 2. Not legal/professional advice
    "This report is informational and is not legal advice, engineering advice, "
    "or a substitute for the adopted code text or a licensed design "
    "professional.",
    # 3. Editions change (caller substitutes the bracketed fields when rendering)
    "Code adoptions and amendments change. This report reflects the adoption "
    "data current as of [data_version_date] for [jurisdiction]. Confirm the "
    "currently enforced edition with the AHJ.",
    # 4. No affiliation (nominative use only; never display SDO logos)
    "Not affiliated with, endorsed by, or sponsored by the International Code "
    "Council, NFPA, IAPMO, ASTM, or any standards organization.",
    # 5. Insurance-context caveat
    "Whether a code upgrade is owed under a policy depends on policy language "
    "(e.g., ordinance or law coverage) and the AHJ's actual enforcement; this "
    "report does not determine coverage.",
]

# Disclaimer #3 variant for when no adoption row resolved: NEVER substitute the
# render date for a data-verification date — say plainly that the date is unknown.
_NO_VERIFIED_DATE_DISCLAIMER = (
    "Code adoptions and amendments change. The adoption-data verification date "
    "for [jurisdiction] is unavailable — confirm the currently enforced edition "
    "with the AHJ."
)


def render_disclaimers(verified_at: str | None = None,
                       jurisdiction: str | None = None) -> list[str]:
    """LIBRARY_DISCLAIMERS with the bracketed placeholders substituted.

    verified_at: adoption-data verification date. When absent, disclaimer #3 is
    swapped for an explicit 'verification date unavailable' sentence — today's
    date must never masquerade as a data-verification date.
    jurisdiction: resolved jurisdiction name (falls back to a generic phrase).
    Every consumer (report PDF, API response) should use this rather than the
    raw template list so no '[data_version_date]' tokens leak to users.
    """
    juris = jurisdiction or "the listed jurisdiction"
    out = []
    for d in LIBRARY_DISCLAIMERS:
        if "[data_version_date]" in d:
            if verified_at:
                d = d.replace("[data_version_date]", str(verified_at)[:10])
            else:
                d = _NO_VERIFIED_DATE_DISCLAIMER
        out.append(d.replace("[jurisdiction]", juris))
    return out


_lock = threading.Lock()
_libraries: dict[str, dict] = {}
_conditions: dict | None = None
_conditions_loaded = False


def _load_conditions() -> dict:
    """Load and cache hazard_conditions.json (read once per process).
    Returns {} if the file is missing/unreadable — hazard annotation is an
    overlay, never a hard dependency."""
    global _conditions, _conditions_loaded
    if not _conditions_loaded:
        with _lock:
            if not _conditions_loaded:
                try:
                    with open(HAZARD_CONDITIONS_PATH, encoding="utf-8") as f:
                        _conditions = json.load(f)
                except (OSError, ValueError, json.JSONDecodeError):
                    _conditions = {}
                _conditions_loaded = True
    return _conditions or {}


def trades() -> list[str]:
    """Trade ids that have a library file present, sorted."""
    if not LIBRARY_DIR.is_dir():
        return []
    return sorted(p.stem for p in LIBRARY_DIR.glob("*.json"))


def _load(trade: str | None = None) -> dict:
    """Load + cache one trade's library JSON (read once per process per trade)."""
    t = trade or DEFAULT_TRADE
    if t not in _libraries:
        with _lock:
            if t not in _libraries:
                with open(LIBRARY_DIR / f"{t}.json", encoding="utf-8") as f:
                    _libraries[t] = json.load(f)
    return _libraries[t]


def _validate_entry(entry: dict, trade: str, edition_key: str) -> None:
    """No-hallucination render invariant: an entry with no pinpoint section or
    no source URL must never reach a report. Raises ValueError naming the
    offending entry so the audit can pinpoint it.

    The source URL is read from 'source_url' first, then 'source' (the field
    the roofing library actually uses for the loaded source URL)."""
    if not str(entry.get("section") or "").strip():
        raise ValueError(f"{trade}/{edition_key}: entry missing 'section': {entry.get('title')!r}")
    if not str(entry.get("source_url") or entry.get("source") or "").strip():
        raise ValueError(f"{trade}/{edition_key}: entry missing 'source_url': {entry.get('section')!r}")


def library_meta(trade: str | None = None) -> dict:
    """The trade library's _meta block (generated date, method, accuracy notes)."""
    return dict(_load(trade).get("_meta", {}))


def available_editions(trade: str | None = None, code: str | None = None) -> list[str]:
    """Edition keys in a trade's library, e.g. ['IRC-2015', ..., 'IBC-2024'].

    Pass code='IRC' or 'IBC' to filter; sorted by code then year.
    """
    keys = [k for k in _load(trade) if k not in ("_meta", "federal")]
    if code:
        prefix = code.strip().upper() + "-"
        keys = [k for k in keys if k.startswith(prefix)]
    return sorted(keys, key=lambda k: (k.rsplit("-", 1)[0], int(k.rsplit("-", 1)[1])))


def _resolve_edition(trade: str | None, code: str, edition: str) -> tuple[str, str | None]:
    """Return (library_key, fallback_note). Exact match preferred; otherwise the
    nearest OLDER edition is used and a note like 'nearest-edition: 2018' is
    returned. Never falls forward to a newer (possibly unadopted) edition.
    """
    lib = _load(trade)
    code_uc = code.strip().upper()
    edition_str = str(edition).strip()
    exact = f"{code_uc}-{edition_str}"
    if exact in lib:
        return exact, None

    try:
        want_year = int(edition_str[:4])
    except ValueError:
        raise LookupError(
            f"Unparseable edition {edition!r} for code {code!r}; "
            f"available: {', '.join(available_editions(trade, code_uc)) or 'none'}"
        )

    older = []
    for key in available_editions(trade, code_uc):
        year = int(key.rsplit("-", 1)[1])
        if year <= want_year:
            older.append((year, key))
    if not older:
        raise LookupError(
            f"No edition of {code_uc} at or before {want_year} in library; "
            f"available: {', '.join(available_editions(trade, code_uc)) or 'none'}"
        )
    nearest_year, key = max(older)
    return key, f"nearest-edition: {nearest_year}"


def _section_sort_key(section: str) -> tuple:
    """Natural-ish ordering for citations like 'R905.2.8.5' or '1511.3.1'."""
    head = section.split("/")[0].strip().split()[0]
    parts = []
    for piece in head.replace("R", "", 1).split("."):
        digits = "".join(ch for ch in piece if ch.isdigit())
        parts.append(int(digits) if digits else 0)
    return tuple(parts)


def _code_entry_to_row(entry: dict, code_source: str, note: str | None) -> dict:
    row = {
        "category": entry.get("category") or "roofing",
        "code_source": code_source,
        "section": entry["section"],
        # Paraphrased summary only (legal_posture.md DO #1); title gives the
        # line item a readable lead-in, citation lives in section/code_source.
        "requirement": f"{entry['title']}: {entry['summary']}",
        "trigger": entry.get("trigger"),
        "sort_order": 0,  # assigned after sorting
    }
    notes = [n for n in (note, entry.get("note")) if n]
    if notes:
        row["notes"] = " | ".join(notes)
    return row


def _federal_rows(trade: str | None = None) -> list[dict]:
    rows = []
    for entry in _load(trade).get("federal", []):
        rows.append({
            "category": "federal",
            "code_source": "Federal",
            "section": entry.get("citation", ""),
            "requirement": f"{entry['title']}: {entry['summary']}",
            "trigger": entry.get("applies_when"),
            # Render invariant: federal rows must also carry a source_url. The
            # federal library entries hold the loaded URL in 'source'; fall back
            # to the citation only if no URL is present.
            "source_url": entry.get("source_url") or entry.get("source") or entry.get("citation"),
            "confidence": entry.get("confidence"),
            "sort_order": 0,
            **({"notes": entry["note"]} if entry.get("note") else {}),
        })
    return rows


def requirements_for(trade: str | None, code: str, edition: str,
                     include_federal: bool | None = None) -> list[dict]:
    """Return cm_requirements-shaped dicts for a trade + code + edition.

    trade:   trade id (e.g. 'roofing'); None defaults to DEFAULT_TRADE so
             callers predating the trade dimension keep working.
    code:    'IRC' or 'IBC' (case-insensitive)
    edition: e.g. '2021'. If the exact edition is missing, falls back to the
             nearest OLDER edition in the library and tags each row's notes
             with 'nearest-edition: X'. Raises LookupError if nothing at or
             before the requested edition exists.
    include_federal: None defers to the trade registry's `federal` flag; pass
             True/False to force.

    Rows carry: category, code_source ('IRC 2021'), section, requirement
    (paraphrased summary), trigger, trade, source_url, confidence, verified_at,
    edition, sort_order (by category then section), and notes where applicable.
    Every row is checked against the no-hallucination render invariant. Federal-
    layer rows (EPA RRP, OSHA fall protection, NFIP 50% rule, asbestos NESHAP)
    sort after the code rows and attach only when the trade is federal-bearing.
    """
    import trades as trademod
    trade = trade or DEFAULT_TRADE
    if include_federal is None:
        try:
            include_federal = trademod.trade(trade)["federal"]
        except KeyError:
            include_federal = False
    key, fallback_note = _resolve_edition(trade, code, edition)
    code_name, year = key.rsplit("-", 1)
    code_source = f"{code_name} {year}"
    # Trade library verification date: prefer a per-entry verified_at; else the
    # library's _meta generated date (the day every source URL was loaded).
    meta_verified = library_meta(trade).get("generated")

    entries = []
    for group in _load(trade)[key].values():  # e.g. {'roofing': [...]}
        entries.extend(group)

    rows = []
    for e in entries:
        _validate_entry(e, trade, key)
        row = _code_entry_to_row(e, code_source, fallback_note)
        row["trade"] = trade
        row["source_url"] = e.get("source_url") or e.get("source")
        row["confidence"] = e.get("confidence")
        row["verified_at"] = e.get("verified_at") or meta_verified
        row["edition"] = year
        rows.append(row)
    rows.sort(key=lambda r: (r["category"], _section_sort_key(r["section"])))

    if include_federal:
        fed = _federal_rows(trade)
        for fr in fed:
            fr["trade"] = trade
        fed.sort(key=lambda r: (r["category"], r["section"]))
        rows.extend(fed)

    for i, row in enumerate(rows):
        row["sort_order"] = i * 10
    return rows


def _section_tokens(section: str | None) -> set[str]:
    """Normalized citation tokens for matching: split on ' / ', strip
    parentheticals and trailing clauses, lowercase. 'R905.2.5 / R905.2.6' ->
    {'r905.2.5', 'r905.2.6'}; '44 CFR 59.1 (definitions ...); enforced ...'
    -> {'44 cfr 59.1'}."""
    out = set()
    for piece in str(section or "").split(" / "):
        piece = re.sub(r"\(.*?\)", "", piece)   # drop parentheticals
        piece = piece.split(";")[0]             # drop trailing clauses
        piece = " ".join(piece.split()).strip().lower()
        if piece:
            out.add(piece)
    return out


def _row_code_edition(row: dict) -> tuple[str, str]:
    """('IRC', '2021') from a row's code_source; federal rows -> ('FEDERAL',
    'current') to match hazard_conditions.json library_match entries."""
    src = str(row.get("code_source") or "").strip()
    if src.lower() == "federal" or (row.get("category") or "").lower() == "federal":
        return "FEDERAL", "current"
    parts = src.split()
    return (parts[0].upper() if parts else "",
            parts[1] if len(parts) > 1 else "")


def _resolve_condition(cond: dict, hazards: dict) -> tuple[bool | None, str | None]:
    """(applies, note) for one hazard condition given a hazards_for() dict.
    applies None = leave the row's existing conditional wording as-is."""
    cz = ((hazards.get("climate_zone") or {}).get("value"))
    wind = ((hazards.get("wind") or {}).get("value_or_null"))
    snow = ((hazards.get("snow") or {}).get("value_or_null"))
    ctype = cond.get("condition_type")
    rule = cond.get("rule") or ""

    if ctype == "climate_zone":
        if not cz:
            return None, None
        if rule.startswith("ice_dam"):
            # Research is explicit: ice-barrier triggers are jurisdictional
            # (Table R301.2 / AHJ history finding) — a climate zone must never
            # be presented as the trigger. Stay conditional, annotate only.
            return None, (f"site climate zone {cz} on file; ice-barrier "
                          "designation is jurisdictional (Table R301.2 / AHJ) "
                          "— confirm locally, zone is not the code trigger")
        if rule.startswith("vent_reduction_1_300"):
            try:
                zone_num = int(str(cz)[0])
            except (ValueError, IndexError):
                return None, None
            if zone_num >= 6:
                return True, (f"applies: climate zone {cz} — Class I/II "
                              "ceiling vapor retarder condition for the 1/300 "
                              "vent reduction is in effect")
            return True, (f"applies: climate zone {cz} — outside zones 6-8, "
                          "the vapor-retarder prong of the 1/300 reduction "
                          "does not apply; baseline venting and balanced-vent "
                          "placement still govern")
        return None, f"site climate zone {cz} on file"

    if ctype == "wind_vult":
        if wind is None:
            return None, None  # link-out hazard: value unknown by design
        try:
            v = float(wind)
        except (TypeError, ValueError):
            return None, None  # non-numeric wind value: stay conditional
        if rule == "vult_gte_140":
            if v >= 140:
                return True, f"applies: site V_ult {v:g} mph >= 140 mph"
            return False, (f"site V_ult {v:g} mph is below the 140 mph "
                           "high-wind underlayment threshold")
        if rule == "vult_gte_130_hurricane_prone_else_gte_140":
            if v >= 140:
                return True, f"applies: site V_ult {v:g} mph >= 140 mph"
            if v < 130:
                return False, (f"site V_ult {v:g} mph is below both the "
                               "130 mph (hurricane-prone) and 140 mph "
                               "thresholds")
            return None, (f"site V_ult {v:g} mph — applies only if the site "
                          "is in a hurricane-prone region per the adopted "
                          "code's definition")
        if rule in ("shingle_class_lookup_by_vult",
                    "uplift_design_and_shingle_class_lookup_by_vult"):
            return True, (f"applies at all wind speeds; required class/uplift "
                          f"performance is keyed to site V_ult {v:g} mph — "
                          "read the adopted edition's table row")
        # wind_design_required_per_figure_r301_2_1_1 (geographic designation)
        # and vasd_* (needs the code's 1609.3.1 conversion): not resolvable
        # from a bare V_ult number.
        return None, (f"site V_ult {v:g} mph on file; this trigger resolves "
                      "from the adopted code's own wind provisions, not a "
                      "bare speed comparison")

    if ctype == "snow_load":
        if snow is None:
            return None, None
        return None, (f"site ground snow load {snow} psf on file; the "
                      "1608.3/1611.2 check is an engineering determination")

    # flood_sfha (and any future types): no embedded data source wired yet.
    return None, None


def apply_hazard_conditions(rows: list[dict], hazards: dict | None) -> list[dict]:
    """Annotate requirement rows with resolved hazard applicability.

    For each row matching a hazard_conditions.json entry (by code, edition,
    and citation tokens), if the relevant hazard value in `hazards` (a
    hazards.hazards_for() dict) is known, set applies=True/False with an
    explanatory note appended to the row's notes; if unknown, the row is left
    as-is with its existing conditional wording (when_unknown =
    include_conditional — never silently drop or silently assert).

    Pure function: returns new row dicts (inputs are not mutated); the only
    I/O is loading the conditions file once per process.
    """
    conds = _load_conditions().get("conditions") or []
    if not conds or not hazards:
        return [dict(r) for r in rows]

    out = []
    for row in rows:
        r = dict(row)
        code, edition = _row_code_edition(r)
        row_tokens = _section_tokens(r.get("section"))
        for cond in conds:
            lm = cond.get("library_match") or {}
            if (lm.get("code") or "").upper() != code:
                continue
            if edition not in [str(e) for e in (lm.get("editions") or [])]:
                continue
            if not (row_tokens & _section_tokens(lm.get("section"))):
                continue
            applies, note = _resolve_condition(cond, hazards)
            if applies is not None:
                r["applies"] = applies
            if note:
                r["notes"] = " | ".join(
                    n for n in (r.get("notes"), note) if n)
            break
        out.append(r)
    return out


if __name__ == "__main__":
    meta = library_meta()
    print(f"requirements_library.json generated: {meta.get('generated')}")
    print(f"editions: {', '.join(available_editions('roofing'))}")
    print(f"federal layer entries: {len(_load('roofing').get('federal', []))}")
    print(f"disclaimers: {len(LIBRARY_DISCLAIMERS)}")
    print()
    print("counts per edition (code rows + federal = total):")
    for key in available_editions("roofing"):
        code_name, year = key.rsplit("-", 1)
        with_fed = requirements_for("roofing", code_name, year)
        code_only = requirements_for("roofing", code_name, year, include_federal=False)
        assert all(
            set(r) >= {"category", "code_source", "section", "requirement",
                       "trigger", "sort_order"}
            for r in with_fed
        )
        assert [r["sort_order"] for r in with_fed] == sorted(
            {r["sort_order"] for r in with_fed}
        ), "sort_order must be unique and ascending"
        print(f"  {key}: {len(code_only)} + {len(with_fed) - len(code_only)} "
              f"federal = {len(with_fed)}")

    # Edition fallback: 2019 has no key -> nearest older (2018), tagged in notes
    fb = requirements_for("roofing", "IRC", "2019", include_federal=False)
    assert fb and all(r["code_source"] == "IRC 2018" for r in fb)
    assert all("nearest-edition: 2018" in (r.get("notes") or "") for r in fb)
    print(f"\nfallback IRC 2019 -> {fb[0]['code_source']} "
          f"({len(fb)} rows, notes tag: 'nearest-edition: 2018')")

    try:
        requirements_for("roofing", "IRC", "2012")
        print("ERROR: expected LookupError for pre-2015 edition")
    except LookupError as exc:
        print(f"pre-library edition correctly rejected: {exc}")

    sample = requirements_for("roofing", "IRC", "2021", include_federal=False)[0]
    print(f"\nsample row: {json.dumps(sample, indent=2)}")

    # Hazard-condition overlay: known climate zone resolves the vent rule,
    # unknown wind leaves wind-conditional rows untouched, inputs unmutated.
    haz = {"climate_zone": {"value": "7"}, "seismic": None,
           "wind": {"value_or_null": None}, "snow": {"value_or_null": None}}
    base = requirements_for("roofing", "IRC", "2021")
    before = json.dumps(base, sort_keys=True)
    annotated = apply_hazard_conditions(base, haz)
    assert json.dumps(base, sort_keys=True) == before, "must not mutate input"
    vent = [r for r in annotated if "R806" in r["section"]][0]
    assert vent["applies"] is True and "climate zone 7" in vent["notes"]
    wind_row = [r for r in annotated if r["section"] == "R905.2.4.1"][0]
    assert "applies" not in wind_row or wind_row["applies"] is None
    ice = [r for r in annotated if r["section"] == "R905.1.2"][0]
    assert ice.get("applies") is None and "jurisdictional" in ice["notes"]
    n_annotated = sum(1 for a, b in zip(annotated, base) if a != b)
    print(f"\nhazard overlay: {n_annotated} of {len(base)} IRC 2021 rows "
          f"annotated for climate zone 7 (wind/snow left conditional)")

    haz_wind = dict(haz, wind={"value_or_null": 150})
    annotated_w = apply_hazard_conditions(base, haz_wind)
    under = [r for r in annotated_w if r["section"] == "R905.1.1"][0]
    assert under.get("applies") is None  # 2021 trigger is geographic, not mph
    cls = [r for r in annotated_w if r["section"] == "R905.2.4.1"][0]
    assert cls["applies"] is True and "150" in cls["notes"]
    print("hazard overlay: V_ult=150 resolves shingle-class row, leaves the "
          "2021 figure-based underlayment trigger conditional (correct)")

    # --- trade-aware API ---
    assert "roofing" in trades(), trades()
    rows_roof = requirements_for("roofing", "IRC", "2021")
    assert rows_roof and all(r.get("source_url") for r in rows_roof), "every row must carry a source_url"
    assert all(r["trade"] == "roofing" for r in rows_roof)
    # Default trade is roofing (back-compat for pre-repoint callers)
    assert requirements_for(None, "IRC", "2021") == requirements_for("roofing", "IRC", "2021")
    # Render invariant: an entry without section/source_url is rejected
    bad = {"section": "", "title": "x", "summary": "y", "source_url": "u"}
    try:
        _validate_entry(bad, "roofing", "IRC-2021"); assert False, "expected ValueError"
    except ValueError:
        pass
    bad2 = {"section": "R905.1", "title": "x", "summary": "y", "source_url": ""}
    try:
        _validate_entry(bad2, "roofing", "IRC-2021"); assert False, "expected ValueError"
    except ValueError:
        pass
    print(f"cmlibrary trade-aware OK — trades={trades()}, roofing IRC2021 rows={len(rows_roof)}")
