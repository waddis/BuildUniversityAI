# Trade-Specific, Zero-Hallucination Reports — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Codes&More reports trade-specific (user picks the trade[s]), resolving each trade's adopted code/edition granular to the jurisdiction, rendering only researched + cited requirements, with a Sources & Citations page in the PDF and a hard no-hallucination guarantee.

**Architecture:** A trade registry maps each trade to a code-adoption *discipline* and code/chapters. Per-discipline adoptions live in a new normalized `cm_discipline_adoptions` table resolved place→county→state (AHJ-confirm fallback). A trade-aware requirements library (split into per-trade JSON files) serves cited rows; a render invariant rejects any uncited entry. Reports carry selected trades + per-row provenance; the PDF groups by trade and ends with a citations page.

**Tech Stack:** Python 3 (stdlib-only backend, `http.server`), vanilla JS dashboard (`dashboard/template.html`), Playwright PDF (`pdf.py` + `cm_report_template.html`), Supabase Postgres (shared suite project `eitnccqaysidqvgudeeb`). Tests = embedded `__main__` assert self-tests run with `python3 bin/<module>.py` (codebase convention — no pytest).

**Spec:** `docs/superpowers/specs/2026-06-17-trade-specific-reports-design.md`

**Working directory:** `~/12squared-ai/codesandmore`

---

## File Structure

| File | Responsibility | New/Modify |
|------|----------------|------------|
| `bin/trades.py` | Trade taxonomy: id, label, discipline, code/chapter map, federal applicability, edition-key prefixes | Create |
| `data/research/library/roofing.json` | Roofing library (migrated verbatim from today's monolith) | Create (move) |
| `data/research/library/exterior.json` | Exterior/siding/windows library (researched, cited) | Create |
| `bin/cmlibrary.py` | Trade-aware cited requirements + render invariant + per-trade disclaimers | Modify |
| `bin/audit_library.py` | Structural + link audit; release gate | Create |
| `bin/cmadoption.py` | Resolve discipline edition from FIPS stack (place→county→state→AHJ-confirm) | Create |
| `migrations/cm_0016_discipline_adoptions.sql` | `cm_discipline_adoptions` table + `cm_reports.trades` + `cm_requirements` provenance columns | Create (apply gated on approval) |
| `bin/cmdata.py` | `get_discipline_adoptions()` fetch + `create_report`/`add_requirements` carry provenance | Modify |
| `bin/serve.py` | `_create_report` multi-trade build; `/api/cm/resolve` per-trade preview | Modify |
| `bin/cmreport.py` | Per-trade report data + citations list | Modify |
| `bin/cm_report_template.html` | Per-trade sections + Sources & Citations page | Modify |
| `dashboard/template.html` | Trade picker + per-trade resolve preview | Modify |

**Test runner convention:** each backend module gets/extends an `if __name__ == "__main__":` block of `assert` self-tests. "Run the test" = `python3 bin/<module>.py` from `~/12squared-ai/codesandmore`, expected to exit 0 and print a summary. Pure-stdlib modules use system `python3`; modules importing PDF/network deps note the venv (`$HOME/hailscan/.venv/bin/python`).

---

## Phase 1 — Trade rails

### Task 1: Trade registry (`bin/trades.py`)

**Files:**
- Create: `bin/trades.py`

- [ ] **Step 1: Write the failing self-test**

Create `bin/trades.py` containing ONLY this `__main__` block first (the functions don't exist yet, so it fails):

```python
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `python3 bin/trades.py`
Expected: `NameError: name 'TRADES' is not defined`

- [ ] **Step 3: Write the minimal implementation**

Prepend above the `__main__` block:

```python
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
```

- [ ] **Step 4: Run it to verify it passes**

Run: `python3 bin/trades.py`
Expected: `trades.py OK — 5 trades, disciplines=['building', 'electrical', 'mechanical', 'plumbing']`

- [ ] **Step 5: Commit**

```bash
git add bin/trades.py
git commit -m "codesandmore: add trade taxonomy registry (trades.py)"
```

---

### Task 2: Move roofing library into per-trade layout (no content change)

**Files:**
- Create: `data/research/library/roofing.json` (moved from `data/research/requirements_library.json`)

- [ ] **Step 1: Move the file with git (preserve history) and confirm bytes unchanged**

Run:
```bash
mkdir -p data/research/library
git mv data/research/requirements_library.json data/research/library/roofing.json
python3 -c "import json; d=json.load(open('data/research/library/roofing.json')); print('editions:', [k for k in d if k not in ('_meta','federal')]); print('has federal:', 'federal' in d)"
```
Expected: editions list `['IRC-2015','IRC-2018','IRC-2021','IRC-2024','IBC-2015','IBC-2018','IBC-2021','IBC-2024']`, `has federal: True`.

- [ ] **Step 2: Commit the move**

```bash
git add -A data/research/
git commit -m "codesandmore: move roofing library into per-trade layout (data/research/library/roofing.json)"
```

(`cmlibrary.py` still points at the old path and will be repointed in Task 3 — do not run it between this commit and Task 3.)

---

### Task 3: Make `cmlibrary` trade-aware + enforce the render invariant

**Files:**
- Modify: `bin/cmlibrary.py`

Key changes: load per-trade library files by trade id; add `trade` parameter to the public functions; enforce that every entry has a non-empty `section` and `source_url` (the no-hallucination render invariant); federal layer attaches only when the trade's `federal` flag is set; `roofing` stays the default so existing callers keep working until Phase 3 repoints them.

- [ ] **Step 1: Write the failing self-tests**

Append to the existing `if __name__ == "__main__":` block in `bin/cmlibrary.py` (before the final lines):

```python
    # --- trade-aware API ---
    assert "roofing" in trades(), trades()
    rows_roof = requirements_for("roofing", "IRC", "2021")
    assert rows_roof and all(r.get("source_url") for r in rows_roof), "every row must carry a source_url"
    assert all(r["trade"] == "roofing" for r in rows_roof)
    # Default trade is roofing (back-compat for pre-Phase-3 callers)
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `python3 bin/cmlibrary.py`
Expected: `NameError: name 'trades' is not defined` (or `_validate_entry`).

- [ ] **Step 3: Implement the trade-aware loader + invariant**

In `bin/cmlibrary.py`:

1. Replace the single `LIBRARY_PATH` constant and `_load()` with a per-trade loader:

```python
LIBRARY_DIR = Path(__file__).resolve().parent.parent / "data" / "research" / "library"
DEFAULT_TRADE = "roofing"

_libraries: dict[str, dict] = {}


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
                path = LIBRARY_DIR / f"{t}.json"
                with open(path, encoding="utf-8") as f:
                    self._libraries  # noqa: F821  (placeholder removed below)
```

   Replace that stub body with the real cached read (mirror the existing pattern — no `self`):

```python
def _load(trade: str | None = None) -> dict:
    t = trade or DEFAULT_TRADE
    if t not in _libraries:
        with _lock:
            if t not in _libraries:
                with open(LIBRARY_DIR / f"{t}.json", encoding="utf-8") as f:
                    _libraries[t] = json.load(f)
    return _libraries[t]
```

2. Add the render invariant helper:

```python
def _validate_entry(entry: dict, trade: str, edition_key: str) -> None:
    """No-hallucination render invariant: an entry with no pinpoint section or
    no source_url must never reach a report. Raises ValueError naming the
    offending entry so the audit can pinpoint it."""
    if not str(entry.get("section") or "").strip():
        raise ValueError(f"{trade}/{edition_key}: entry missing 'section': {entry.get('title')!r}")
    if not str(entry.get("source_url") or "").strip():
        raise ValueError(f"{trade}/{edition_key}: entry missing 'source_url': {entry.get('section')!r}")
```

3. Thread `trade` through `available_editions`, `_resolve_edition`, `requirements_for`, and have `_load()` calls pass the trade. Update signatures:

```python
def available_editions(trade: str | None = None, code: str | None = None) -> list[str]:
    keys = [k for k in _load(trade) if k not in ("_meta", "federal")]
    ...

def _resolve_edition(trade: str | None, code: str, edition: str) -> tuple[str, str | None]:
    lib = _load(trade)
    ...  # call available_editions(trade, code_uc) instead of available_editions(code_uc)

def requirements_for(trade: str | None, code: str, edition: str,
                     include_federal: bool | None = None) -> list[dict]:
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
    entries = []
    for group in _load(trade)[key].values():
        entries.extend(group)
    rows = []
    for e in entries:
        _validate_entry(e, trade, key)
        row = _code_entry_to_row(e, code_source, fallback_note)
        row["trade"] = trade
        row["source_url"] = e["source_url"]
        row["confidence"] = e.get("confidence")
        row["verified_at"] = e.get("verified_at")
        row["edition"] = year
        rows.append(row)
    rows.sort(key=lambda r: (r["category"], _section_sort_key(r["section"])))
    if include_federal:
        fed = _federal_rows()
        for fr in fed:
            fr["trade"] = trade
        fed.sort(key=lambda r: (r["category"], r["section"]))
        rows.extend(fed)
    for i, row in enumerate(rows):
        row["sort_order"] = i * 10
    return rows
```

4. In `_federal_rows()`, add `"source_url"` to each federal row (the federal entries in `roofing.json` carry a `citation`/source — use `entry.get("source_url") or entry.get("citation")` so the invariant holds) and keep `category="federal"`.

5. Update the pre-existing `__main__` self-test lines that call `requirements_for("IRC", "2021", ...)` to the new signature `requirements_for("roofing", "IRC", "2021", ...)`, and `available_editions()` to `available_editions("roofing")`.

- [ ] **Step 4: Run it to verify it passes**

Run: `python3 bin/cmlibrary.py`
Expected: existing per-edition counts print, then `cmlibrary trade-aware OK — trades=['roofing'], roofing IRC2021 rows=N`.

- [ ] **Step 5: Commit**

```bash
git add bin/cmlibrary.py
git commit -m "codesandmore: trade-aware cmlibrary + no-hallucination render invariant"
```

---

### Task 4: Audit harness (`bin/audit_library.py`)

**Files:**
- Create: `bin/audit_library.py`

- [ ] **Step 1: Write the failing self-test**

Create `bin/audit_library.py` with this `__main__` first:

```python
if __name__ == "__main__":
    import sys
    problems = audit_all()
    for p in problems:
        print("FAIL:", p)
    print(f"audit_library: {len(problems)} problem(s) across trades={cmlibrary.trades()}")
    sys.exit(1 if problems else 0)
```

- [ ] **Step 2: Run it to verify it fails**

Run: `python3 bin/audit_library.py`
Expected: `NameError: name 'audit_all' is not defined`.

- [ ] **Step 3: Implement the structural audit**

Prepend:

```python
#!/usr/bin/env python3
"""Structural + link audit for the per-trade requirement libraries.

Structural mode (default): every entry across every trade library carries a
non-empty section, title, summary, source_url, confidence, and verified_at;
each library file has a _meta block; no edition key is malformed. Exit non-zero
on any violation so it can gate releases.

Link mode (--links): additionally HEAD/GET each distinct source_url and flag
any that no longer resolve. Network, opt-in.
"""
from __future__ import annotations

import sys

import cmlibrary

REQUIRED_FIELDS = ("section", "title", "summary", "source_url", "confidence", "verified_at")
VALID_CONFIDENCE = {"high", "medium", "low"}


def _audit_trade(trade: str) -> list[str]:
    problems: list[str] = []
    lib = cmlibrary._load(trade)
    if "_meta" not in lib:
        problems.append(f"{trade}: missing _meta block")
    for edition_key, groups in lib.items():
        if edition_key in ("_meta", "federal"):
            continue
        if "-" not in edition_key:
            problems.append(f"{trade}: malformed edition key {edition_key!r}")
            continue
        for category, entries in groups.items():
            for e in entries:
                for fld in REQUIRED_FIELDS:
                    if not str(e.get(fld) or "").strip():
                        problems.append(f"{trade}/{edition_key}/{category}: entry {e.get('section') or e.get('title')!r} missing {fld}")
                if e.get("confidence") and e["confidence"] not in VALID_CONFIDENCE:
                    problems.append(f"{trade}/{edition_key}: bad confidence {e['confidence']!r} on {e.get('section')!r}")
    return problems


def audit_all() -> list[str]:
    problems: list[str] = []
    for trade in cmlibrary.trades():
        problems.extend(_audit_trade(trade))
    return problems


def check_links() -> list[str]:
    import urllib.request
    seen, problems = set(), []
    for trade in cmlibrary.trades():
        lib = cmlibrary._load(trade)
        for edition_key, groups in lib.items():
            if edition_key in ("_meta", "federal"):
                continue
            for entries in groups.values():
                for e in entries:
                    url = e.get("source_url")
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
```

Update `__main__` to honor `--links`:

```python
if __name__ == "__main__":
    problems = audit_all()
    if "--links" in sys.argv:
        problems += check_links()
    for p in problems:
        print("FAIL:", p)
    print(f"audit_library: {len(problems)} problem(s) across trades={cmlibrary.trades()}")
    sys.exit(1 if problems else 0)
```

- [ ] **Step 4: Run it to verify it passes on roofing**

Run: `python3 bin/audit_library.py`
Expected: `audit_library: 0 problem(s) across trades=['roofing']`, exit 0.

> If roofing entries lack `confidence`/`verified_at` fields, that is a real audit finding — add the missing per-entry metadata to `roofing.json` (the `_meta.accuracy_notes` records confidence at the file level today; promote it onto entries) until the audit passes. Do NOT weaken the audit.

- [ ] **Step 5: Commit**

```bash
git add bin/audit_library.py data/research/library/roofing.json
git commit -m "codesandmore: add library audit harness (structural + link check)"
```

---

## Phase 2 — Per-discipline adoption (granular to jurisdiction)

### Task 5: Migration SQL for `cm_discipline_adoptions` + report/requirement columns

**Files:**
- Create: `migrations/cm_0016_discipline_adoptions.sql`

> **GUARDRAIL:** This migration runs against the shared production Supabase
> (`eitnccqaysidqvgudeeb`). Per the suite rule, it is **applied only after
> William explicitly approves the exact SQL**. This task WRITES the file and
> STOPS for approval. Application is Task 6.

- [ ] **Step 1: Write the migration file**

Create `migrations/cm_0016_discipline_adoptions.sql`:

```sql
-- cm_0016: per-discipline code adoptions granular to jurisdiction + trade
-- scoping on reports + provenance on requirements. Additive/reversible.

create table if not exists public.cm_discipline_adoptions (
  id           uuid primary key default gen_random_uuid(),
  level        text not null check (level in ('state','county','place')),
  state_abbr   text not null,
  county_fips  text,
  place_fips   text,
  discipline   text not null check (discipline in ('building','mechanical','electrical','plumbing')),
  code         text not null,
  edition      text not null,
  verified_at  date,
  source_url   text,
  confidence   text check (confidence in ('high','medium','low')),
  created_at   timestamptz not null default now()
);

create unique index if not exists cm_discipline_adoptions_key
  on public.cm_discipline_adoptions
  (level, state_abbr, coalesce(county_fips,''), coalesce(place_fips,''), discipline);

create index if not exists cm_discipline_adoptions_lookup
  on public.cm_discipline_adoptions (state_abbr, discipline);

alter table public.cm_reports
  add column if not exists trades text[] not null default '{}';

alter table public.cm_requirements
  add column if not exists trade       text,
  add column if not exists source_url  text,
  add column if not exists confidence  text,
  add column if not exists verified_at date,
  add column if not exists edition     text;
```

Also create the rollback `migrations/cm_0016_discipline_adoptions_rollback.sql`:

```sql
drop table if exists public.cm_discipline_adoptions;
alter table public.cm_reports drop column if exists trades;
alter table public.cm_requirements
  drop column if exists trade,
  drop column if exists source_url,
  drop column if exists confidence,
  drop column if exists verified_at,
  drop column if exists edition;
```

- [ ] **Step 2: Commit the SQL (not yet applied)**

```bash
git add migrations/cm_0016_discipline_adoptions.sql migrations/cm_0016_discipline_adoptions_rollback.sql
git commit -m "codesandmore: cm_0016 migration SQL (discipline adoptions + trade scoping) — pending approval"
```

- [ ] **Step 3: STOP — present the SQL to William for explicit approval before applying.**

Do not proceed to Task 6 until William says to apply it.

---

### Task 6: Apply the migration (after approval)

**Files:** none (DB only)

- [ ] **Step 1: Apply via the documented Management-API path**

From the working migration path (per project memory): in a linked Supabase dir,
```bash
supabase db query --linked -f migrations/cm_0016_discipline_adoptions.sql
```

- [ ] **Step 2: Verify the schema landed**

Run a `select` confirming the table + columns exist:
```bash
supabase db query --linked "select column_name from information_schema.columns where table_name='cm_discipline_adoptions' order by 1;"
```
Expected: the 11 columns from the migration.

- [ ] **Step 3: No commit (DB change). Note completion in `tasks/todo.md`.**

---

### Task 7: Discipline-adoption fetch in `cmdata.py`

**Files:**
- Modify: `bin/cmdata.py`

- [ ] **Step 1: Write the failing self-test**

Add (or create) a `__main__` self-test in `bin/cmdata.py` that exercises the row-shaping pure helper without needing the DB:

```python
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `python3 bin/cmdata.py`
Expected: `NameError: name '_best_discipline_row' is not defined`.

- [ ] **Step 3: Implement fetch + selection**

Add to `bin/cmdata.py` (mirror the existing `get_state_adoption`/`get_local_adoptions` REST patterns for the query; the selection helper is pure):

```python
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
```

(Use the same `_req` helper the other `cm_*` fetches use; match its exact signature.)

- [ ] **Step 4: Run it to verify it passes**

Run: `python3 bin/cmdata.py`
Expected: `cmdata discipline-row selection OK`.

- [ ] **Step 5: Commit**

```bash
git add bin/cmdata.py
git commit -m "codesandmore: cmdata discipline-adoption fetch + most-specific selection"
```

---

### Task 8: Discipline edition resolver (`bin/cmadoption.py`)

**Files:**
- Create: `bin/cmadoption.py`

- [ ] **Step 1: Write the failing self-test**

Create `bin/cmadoption.py` with this `__main__`:

```python
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `python3 bin/cmadoption.py`
Expected: `NameError: name 'resolve_from_rows' is not defined`.

- [ ] **Step 3: Implement the resolver**

```python
#!/usr/bin/env python3
"""Resolve a trade's adopted code+edition for a jurisdiction, per discipline.

Granular to the jurisdiction: most-specific VERIFIED adoption wins
(place > county > state). No verified row at any level -> ahj_confirm sentinel:
the trade still renders its requirements keyed to a reference edition the UI/PDF
labels "edition adopted per AHJ — confirm locally", never asserting a year we
have not read. Stdlib-only; the DB fetch lives in cmdata.
"""
from __future__ import annotations

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
```

- [ ] **Step 4: Run it to verify it passes**

Run: `python3 bin/cmadoption.py`
Expected: `cmadoption OK — resolved NEC 2017 (state); empty -> ahj_confirm`.

- [ ] **Step 5: Commit**

```bash
git add bin/cmadoption.py
git commit -m "codesandmore: per-discipline edition resolver (cmadoption.py)"
```

---

## Phase 3 — Report build & data model

### Task 9: Multi-trade report build in `serve.py` `_create_report`

**Files:**
- Modify: `bin/serve.py` (`_create_report`, lines ~410-430)

The report now carries a `trades` list. For each selected trade: resolve its discipline edition (building trades use the existing `code_cycle`/`_suggest_cycle`; non-building trades use `cmadoption.resolve`), then pull cited rows and bulk-insert with provenance.

- [ ] **Step 1: Write the failing self-test (pure builder extracted)**

Add a pure helper `_trade_build_plan` and self-test it in `serve.py`'s `__main__` (create the block if absent). The helper decides, per trade, the (code, edition, ahj_confirm) WITHOUT doing I/O — it takes the resolved building cycle and a callable for discipline resolution:

```python
if __name__ == "__main__":
    import trades as trademod
    # building trade uses the passed building cycle; non-building uses resolver
    plan = _trade_build_plan(
        ["roofing", "electrical"],
        building_cycle=("IRC", "2021"),
        resolve_discipline=lambda disc: {"code": "NEC", "edition": "2017", "ahj_confirm": False}
            if disc == "electrical" else {"code": None, "edition": None, "ahj_confirm": True},
    )
    assert plan["roofing"] == {"code": "IRC", "edition": "2021", "ahj_confirm": False}, plan
    assert plan["electrical"] == {"code": "NEC", "edition": "2017", "ahj_confirm": False}, plan
    # unknown building cycle -> roofing ahj_confirm
    plan2 = _trade_build_plan(["roofing"], building_cycle=(None, None),
                              resolve_discipline=lambda d: {"code": None, "edition": None, "ahj_confirm": True})
    assert plan2["roofing"]["ahj_confirm"] is True
    print("serve _trade_build_plan OK")
```

- [ ] **Step 2: Run it to verify it fails**

Run: `python3 bin/serve.py` (the `__main__` runs the asserts before starting the server — guard the server start with `if "--serve" in sys.argv or not _SELFTEST`; simplest: put the self-test under `if __name__ == "__main__" and os.environ.get("CM_SELFTEST")=="1"` and run `CM_SELFTEST=1 python3 bin/serve.py`).
Run: `CM_SELFTEST=1 python3 bin/serve.py`
Expected: `NameError: name '_trade_build_plan' is not defined`.

- [ ] **Step 3: Implement the pure planner + wire it into `_create_report`**

Add the pure planner near `_create_report`:

```python
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
```

Rewrite `_create_report` to consume `trades`:

```python
def _create_report(body: dict, token: str | None, caller=None) -> dict:
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
        for tid, p in plan.items():
            if not (p["code"] and p["edition"]):
                errors[tid] = "edition adopted per AHJ — confirm locally"
                continue
            try:
                all_rows.extend(cmlibrary.requirements_for(tid, p["code"], p["edition"]))
            except (LookupError, OSError, ValueError) as e:
                errors[tid] = str(e)
        inserted = cmdata.add_requirements(report["id"], all_rows, token, caller=caller) if all_rows else []
        report["auto_populated"] = len(inserted)
        if errors:
            report["trade_notes"] = errors
    return report
```

- [ ] **Step 4: Run it to verify it passes**

Run: `CM_SELFTEST=1 python3 bin/serve.py`
Expected: `serve _trade_build_plan OK`.

- [ ] **Step 5: Commit**

```bash
git add bin/serve.py
git commit -m "codesandmore: multi-trade report build with per-discipline edition resolution"
```

---

### Task 10: Carry provenance through `cmdata.add_requirements`

**Files:**
- Modify: `bin/cmdata.py` (`add_requirements`, ~line 217)

- [ ] **Step 1: Write the failing self-test**

Add to `cmdata.py` `__main__`:

```python
    shaped = _requirement_insert_rows("rep-1", [{
        "category": "roofing", "code_source": "IRC 2021", "section": "R905.1",
        "requirement": "x: y", "trigger": None, "sort_order": 0,
        "trade": "roofing", "source_url": "https://x", "confidence": "high",
        "verified_at": "2026-06-09", "edition": "2021"}])
    row = shaped[0]
    assert row["report_id"] == "rep-1"
    for k in ("trade", "source_url", "confidence", "verified_at", "edition"):
        assert k in row, k
    print("cmdata requirement provenance shaping OK")
```

- [ ] **Step 2: Run it to verify it fails**

Run: `python3 bin/cmdata.py`
Expected: `NameError: name '_requirement_insert_rows' is not defined` (or `KeyError` if the existing inline shaping drops the new columns).

- [ ] **Step 3: Implement**

Extract the row-shaping inside `add_requirements` into `_requirement_insert_rows(report_id, rows)` and include the new columns (`trade`, `source_url`, `confidence`, `verified_at`, `edition`) alongside the existing ones. `add_requirements` calls it then POSTs. Preserve the existing PGRST102 key-normalization behavior.

- [ ] **Step 4: Run it to verify it passes**

Run: `python3 bin/cmdata.py`
Expected: `cmdata requirement provenance shaping OK`.

- [ ] **Step 5: Commit**

```bash
git add bin/cmdata.py
git commit -m "codesandmore: persist requirement provenance (trade, source_url, confidence, verified_at, edition)"
```

---

## Phase 4 — PDF: per-trade sections + Sources & Citations page

### Task 11: Per-trade report data + citations list in `cmreport.py`

**Files:**
- Modify: `bin/cmreport.py` (the `data` dict, ~lines 156-166)

- [ ] **Step 1: Write the failing self-test**

Add a `__main__` self-test to `cmreport.py` for the pure grouping helper (no Playwright needed):

```python
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
    print(f"cmreport grouping OK — {len(groups)} trade groups, {len(cites)} citations")
```

- [ ] **Step 2: Run it to verify it fails**

Run: `python3 bin/cmreport.py`
Expected: `NameError: name '_group_by_trade' is not defined`.

- [ ] **Step 3: Implement grouping + citations and add to `data`**

```python
import trades as trademod

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
    seen, out = set(), []
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
```

In the `data` dict, add:
```python
        "trade_groups": _group_by_trade(reqs),
        "citations": _citations(reqs),
        "trades": report.get("trades") or [],
```
(Keep the flat `requirements` list too for backward compatibility.)

- [ ] **Step 4: Run it to verify it passes**

Run: `python3 bin/cmreport.py`
Expected: `cmreport grouping OK — 2 trade groups, 2 citations`.

- [ ] **Step 5: Commit**

```bash
git add bin/cmreport.py
git commit -m "codesandmore: per-trade grouping + de-duped citations in report data"
```

---

### Task 12: Render per-trade sections + Sources & Citations page in the template

**Files:**
- Modify: `bin/cm_report_template.html`

- [ ] **Step 1: Locate the requirements-rendering block**

Run: `grep -nE 'requirements|data\.requirements|render|citation|disclaimer' bin/cm_report_template.html | head`
Read the section that loops over `data.requirements` today.

- [ ] **Step 2: Replace the flat loop with per-trade sections**

Render `data.trade_groups`: for each group, a trade header showing `group.label` + `group.code_source` (and an "edition adopted per AHJ — confirm locally" note when the group's rows have `ahj_confirm`/no edition), then its `requirements` rows exactly as today (section, requirement, trigger, applies, notes).

- [ ] **Step 3: Add the Sources & Citations page**

After the requirements sections and before/after disclaimers, add a page-break `div` titled "Sources & Citations" that loops `data.citations`, each line rendering: `code_source` · `section` · edition · verified `verified_at` · confidence, with `source_url` as a wrapping link (reuse the existing overflow-wrap rule that fixed long URLs). Add a lead sentence: "Every requirement above is a paraphrased summary of the cited provision; the sources below were loaded on the listed verification dates."

- [ ] **Step 4: Render-verify the PDF (venv python — Playwright)**

Start the server and generate a report through the API (or a small driver), then confirm the PDF has per-trade sections + a citations page:
```bash
$HOME/hailscan/.venv/bin/python bin/serve.py --port 8780   # in one shell
# create a report with trades + auto_populate via the dashboard or curl, then:
$HOME/hailscan/.venv/bin/python -c "import pdf; print(pdf._count_pdf_pages('<generated>.pdf'))"
```
Expected: page count increased by the citations page; open the PDF and SEE per-trade headers + the Sources & Citations page.

- [ ] **Step 5: Commit**

```bash
git add bin/cm_report_template.html
git commit -m "codesandmore: PDF per-trade sections + Sources & Citations page"
```

---

## Phase 5 — UI trade picker

### Task 13: Trade picker + per-trade resolve preview (`dashboard/template.html`)

**Files:**
- Modify: `dashboard/template.html` (report-create flow; the resolve preview ~line 1534 "No library coverage" block)

- [ ] **Step 1: Locate the report-create + resolve-preview code**

Run: `grep -nE 'No library coverage|auto_populate|/api/cm/reports|/api/cm/resolve|library_requirements|code_cycle' dashboard/template.html | head`

- [ ] **Step 2: Add a multi-select trade picker**

In the report-create form, add chips for the trades returned by a new `GET /api/cm/trades` (add the endpoint in `serve.py` returning `trades.TRADES` minus internal fields). Require ≥1 selected. Send `trades: [...]` in the `POST /api/cm/reports` body.

- [ ] **Step 3: Make the resolve preview per-trade and informative**

Update `/api/cm/resolve` (`handle_resolve`/`do_resolve` in `serve.py`) to accept optional `trades` and return a per-trade preview array: `{trade, label, code, edition, count, ahj_confirm, confidence}` using `cmadoption.resolve` + `cmlibrary.requirements_for`. In the dashboard, replace the single "No library coverage … create blank report" line with a per-trade summary (e.g. "Exterior — IRC 2021: 14 requirements", "Electrical — edition adopted per AHJ, confirm locally"). Keep "Create blank report" available as an explicit secondary action, never the only path.

- [ ] **Step 4: Verify in the browser**

Open `http://localhost:8780/app`, start a report, pick trades, confirm the preview shows per-trade resolved editions + counts, and the blank-report dead-end is gone. Screenshot and look at it.

- [ ] **Step 5: Commit**

```bash
git add bin/serve.py dashboard/template.html
git commit -m "codesandmore: trade picker + per-trade resolve preview (no blank dead-end)"
```

---

## Phase 6 — Exterior trade data (proof trade) + end-to-end

### Task 14: Research + author `exterior.json` (cited, audited)

**Files:**
- Create: `data/research/library/exterior.json`

> **No-hallucination procedure (identical to how `roofing.json` was built):**
> requirement content is NOT model-generated. For each edition (IRC-2015/2018/
> 2021/2024, IBC-2015/2018/2021/2024), load the actual chapter text from a
> public jurisdiction adoption viewer (the viewers listed in `roofing.json`
> `_meta.accuracy_notes`), read IRC R703 (wall covering / cladding), R308
> (glazing), R903 (roof–wall flashing interface), and IBC ch.14, and write a
> PARAPHRASED summary + pinpoint `section` + the `source_url` actually loaded +
> `confidence` + `verified_at`. Never paraphrase from memory; never copy
> verbatim code text; never fall forward to an unadopted edition.

- [ ] **Step 1: Author the file in the exact schema**

Match `roofing.json` shape exactly:
```json
{
  "_meta": {"generated": "YYYY-MM-DD", "purpose": "Exterior/siding/windows ...",
            "method": "...loaded viewers...", "accuracy_notes": ["..."]},
  "IRC-2021": {"exterior": [
    {"category": "exterior", "section": "R703.1.1", "title": "...",
     "summary": "<paraphrased>", "trigger": "...", "source_url": "https://<loaded>",
     "confidence": "high", "verified_at": "YYYY-MM-DD"}
  ]},
  "...": {}
}
```
Set each entry's `category` to `"exterior"` so it maps to the exterior trade.

- [ ] **Step 2: Run the audit — it must pass**

Run: `python3 bin/audit_library.py`
Expected: `audit_library: 0 problem(s) across trades=['exterior', 'roofing']`, exit 0.

- [ ] **Step 3: Optional link check**

Run: `python3 bin/audit_library.py --links`
Expected: 0 problems (or fix any dead `source_url`).

- [ ] **Step 4: Confirm cmlibrary serves it**

Run: `python3 -c "import sys; sys.path.insert(0,'bin'); import cmlibrary; r=cmlibrary.requirements_for('exterior','IRC','2021'); print(len(r),'exterior IRC2021 rows; first:', r[0]['section'])"`
Expected: a positive count and a real R703-family section.

- [ ] **Step 5: Commit**

```bash
git add data/research/library/exterior.json bin/audit_library.py
git commit -m "codesandmore: exterior/siding/windows requirements library (researched + cited, audit-green)"
```

---

### Task 15: End-to-end verification (Exterior + Roofing, real address)

**Files:** none (verification)

- [ ] **Step 1: Start the server (venv python for PDF)**

Run: `$HOME/hailscan/.venv/bin/python bin/serve.py --port 8780`

- [ ] **Step 2: Drive a multi-trade report**

Via the dashboard at `http://localhost:8780/app` (signed in), create a report for a real address, select **Roofing + Exterior**, with auto-populate, and generate the PDF.

- [ ] **Step 3: Confirm the deliverable**

- The resolve preview showed per-trade editions + counts (no blank dead-end).
- The PDF has a Roofing section AND an Exterior section, each headed with its code+edition.
- The PDF ends with a Sources & Citations page listing every requirement's code, edition, section, source URL, verified date, confidence.
- `python3 bin/audit_library.py` exits 0.

- [ ] **Step 4: Record results in `tasks/todo.md`**

Note the verified address, page count, and any follow-ups (remaining trades).

- [ ] **Step 5: Commit any doc updates**

```bash
git add tasks/todo.md
git commit -m "codesandmore: record trade-specific report e2e verification"
```

---

## Later trades (same rails, data-only drops)

Mechanical/HVAC, Plumbing, then Electrical each repeat **Task 14's procedure**
exactly — load real adopted chapter text (IMC; IPC/UPC; NEC/NFPA 70), author a
`data/research/library/<trade>.json` in the same schema, pass `audit_library.py`,
and populate `cm_discipline_adoptions` for the trade's discipline (state
baselines → county/place overrides) via deep research. No code changes are
required — the rails (Tasks 1–13) already serve any trade with a library file
and a resolvable discipline edition. Electrical is last because NEC is a separate
SDO with its own edition keys (`NEC-2017`, `NEC-2020`, `NEC-2023`), already
handled by `trades.py` and the nearest-older fallback.

---

## Self-Review

**Spec coverage:**
- Trade model / user picks trades → Tasks 1, 9, 13. ✓
- Per-discipline adoption granular to jurisdiction → Tasks 5–8. ✓
- Per-trade cited library + render invariant → Tasks 2, 3. ✓
- Report data model (trades[], provenance columns) → Tasks 5, 9, 10. ✓
- UI trade picker + informative per-trade preview (no dead-end) → Task 13. ✓
- PDF per-trade sections + Sources & Citations page → Tasks 11, 12. ✓
- Audit harness + no-hallucination guarantee → Tasks 3, 4. ✓
- Exterior as proof trade; later trades as data drops → Tasks 14, "Later trades". ✓
- Shared-prod migration gated on approval → Tasks 5, 6. ✓

**Placeholder scan:** Library *content* for `exterior.json` is intentionally not inlined — it is researched primary-source text that must not be model-generated (Task 14 specifies the schema + the audit gate that enforces completeness). This is a data-acquisition task, not a code placeholder.

**Type/name consistency:** `requirements_for(trade, code, edition)`, `_validate_entry`, `_load(trade)`, `trades()`, `_best_discipline_row`, `get_discipline_adoptions`, `resolve_from_rows`/`resolve`, `_trade_build_plan`, `_requirement_insert_rows`, `_group_by_trade`, `_citations` — names used consistently across all referencing tasks. `cm_discipline_adoptions` columns match between the migration (Task 5), the fetch (Task 7), and the resolver (Task 8).
