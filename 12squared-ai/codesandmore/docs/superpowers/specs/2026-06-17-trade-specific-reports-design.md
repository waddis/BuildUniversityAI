# Codes&More — Trade-Specific, Zero-Hallucination Reports

**Date:** 2026-06-17
**Status:** Approved design (pre-implementation)
**Owner:** William Addis
**Project:** Codes&More (`~/12squared-ai/codesandmore`)

## Problem

Codes&More generates property-specific Ordinance-or-Law / building-code
reports by address or ZIP. Today the requirements library is **roofing-only**
(IRC ch.9 / IBC ch.15 + ventilation/permit sections + a fixed federal layer),
editions IRC/IBC 2015–2024. When a jurisdiction's adopted code/edition does not
resolve into that roofing library (e.g. the Cornwall township, Henry County, IL
case), the report dead-ends in a "No library coverage for this edition yet —
create a blank report and add requirements manually" fallback.

William's directives:

1. **Make reports trade-specific** — the user selects a trade (or trades) and
   the report shows that trade's requirements.
2. **Absolutely no hallucination** — never render a requirement or an adopted
   edition we have not actually read and cited.
3. **Audit the work / provide resources** — every requirement traceable to a
   loaded source.
4. **Citations page in the generated PDF** — a dedicated sources page.

The existing no-hallucination discipline is strong and must be preserved:
paraphrased summaries (never verbatim model-code text), pinpoint section
citations, a `source_url` actually loaded during research, a confidence tag,
and a hard rule never to fall *forward* to a newer (unadopted, fully
copyrighted) edition. See `bin/cmlibrary.py` and
`data/research/legal_posture.md`.

## Decisions (from brainstorming)

- **Sequencing:** trade-specific work first (this spec). Citations page is
  folded in because trade reports need it immediately. The broader
  coverage/no-dead-ends work follows in a later spec.
- **Trade model:** the **user picks the trade(s)**; each report is scoped to
  the selected trades and the PDF shows only those.
- **First-wave trades:** Exterior/siding/windows, Mechanical/HVAC, Electrical,
  Plumbing (in addition to existing Roofing). Build order: Exterior →
  Mechanical → Plumbing → Electrical (Electrical last; NEC is a separate SDO
  with its own edition cycle).
- **Adopted-edition honesty:** resolution must be **granular to the
  jurisdiction (ZIP → FIPS)** via deep research per discipline. Where a
  jurisdiction+discipline is not yet verified, degrade to the next-broader
  verified level (place → county → state) and surface confidence + verified
  date + "confirm with AHJ." Never assert a specific edition we have not read.
- **Adoption storage:** a **new normalized `cm_discipline_adoptions` table**,
  not more columns on `cm_state_adoptions` — so trades/disciplines scale
  without column sprawl and local overrides reuse the same shape.

## Non-Goals

- Verbatim model-code text (legal posture forbids it).
- Model-generated requirement content of any kind. All trade content is
  researched, paraphrased from loaded adoption-viewer text, and cited.
- Completing all four new trades' data in this build. The build delivers the
  **rails** + **Exterior** as the proof trade; the remaining trades and the
  per-discipline adoption corpus land as subsequent, same-shape data drops.
- The broader "always present the code / never dead-end" coverage overhaul
  (separate follow-on spec), beyond making the per-trade resolve honest and
  informative.

## Architecture

A report is scoped to user-selected trade(s). For each trade the system
resolves the **adopted edition for that trade's discipline, granular to the
jurisdiction**, pulls **cited** requirements from a **per-trade library** for
that code+edition, applies the hazard overlay where relevant, and renders
per-trade sections plus a **Sources & Citations** page in the PDF. Zero-
hallucination guardrails apply at data, resolution, and render layers.

### A. Trade registry — `bin/trades.py`

A single source of truth for the trade taxonomy. Each trade declares:

- `id` (`roofing`, `exterior`, `mechanical`, `electrical`, `plumbing`)
- `label`
- `discipline` — the adoption discipline that governs its edition
  (`building` for roofing/exterior, `mechanical`, `electrical`, `plumbing`)
- `codes` — the code family + chapters it maps to:
  - roofing → IRC ch.9 / IBC ch.15 (discipline `building`)
  - exterior → IRC R703 (+ R308 glazing, R903 flashing) / IBC ch.14
    (discipline `building`)
  - mechanical → IMC / IRC ch.12–24 (discipline `mechanical`)
  - electrical → NEC (NFPA 70) / IRC ch.34–43 (discipline `electrical`)
  - plumbing → IPC or UPC / IRC ch.25–33 (discipline `plumbing`)

Trades sharing the `building` discipline (roofing, exterior) inherit the
jurisdiction's IRC/IBC adoption already resolved today. Mechanical, electrical,
and plumbing resolve their own discipline adoption (Section B).

### B. Per-discipline adoption, granular to the jurisdiction

**New table `cm_discipline_adoptions`** (migration, shared-prod — see Risks):

| column         | notes                                                        |
|----------------|--------------------------------------------------------------|
| `id`           | uuid pk                                                      |
| `level`        | `state` \| `county` \| `place`                               |
| `state_abbr`   | always set                                                   |
| `county_fips`  | set when `level` is county/place                             |
| `place_fips`   | set when `level` is place                                    |
| `discipline`   | `building` \| `mechanical` \| `electrical` \| `plumbing`     |
| `code`         | e.g. `IMC`, `NEC`, `IPC`, `UPC`, `IRC`, `IBC`                |
| `edition`      | e.g. `2021`, `2020` (NEC)                                    |
| `verified_at`  | date the adoption was read from a primary source            |
| `source_url`   | the loaded source                                           |
| `confidence`   | `high` \| `medium` \| `low`                                  |

Unique on (`level`, `state_abbr`, `county_fips`, `place_fips`, `discipline`).
`cm_state_adoptions` / `cm_local_adoptions` remain for the `building`
discipline (roofing/exterior) to avoid disturbing the live roofing path; the
new table is authoritative for the new disciplines and may later absorb
building too.

**Resolution** (`bin/cmadoption.py` or extend `cmdata.py`): given the
`jurisdiction.resolve()` FIPS stack and a discipline, select the **most-
specific verified row**: place_fips match → county_fips match → state. Return
`{code, edition, verified_at, source_url, confidence, level}`. If no row exists
at any level, return a sentinel `{edition: None, ahj_confirm: True}` — the trade
still renders its requirements keyed to a **stated reference edition** but
flagged "edition adopted per AHJ — confirm locally," never asserting a year.

**Deep research** populates `cm_discipline_adoptions`: state baselines per
discipline first, then county/place overrides. This is the long pole and runs
alongside the code build. Population scripts mirror `bin/seed_adoptions.py`.

### C. Per-trade requirements library

Split the monolithic `data/research/requirements_library.json` into per-trade
files:

```
data/research/library/roofing.json      (migrated from today's library, unchanged content)
data/research/library/exterior.json     (new, researched)
data/research/library/mechanical.json   (new, researched)
data/research/library/electrical.json   (new, researched)
data/research/library/plumbing.json     (new, researched)
```

Each file keeps today's shape: `_meta` (generated date, method, accuracy notes,
verified sources) + edition keys (`IRC-2021`, `NEC-2020`, `IMC-2021`, …) →
`{category: [entries]}`. Each entry carries: `section`, `title`, `summary`
(paraphrased), `trigger`, `source_url`, `confidence`, `verified_at`.

`bin/cmlibrary.py` becomes **trade-aware**:

- `trades() -> list[str]`
- `available_editions(trade, code=None)`
- `requirements_for(trade, code, edition, include_federal=...)` — federal layer
  attaches only to trades where it applies (roofing/exterior keep RRP/asbestos/
  NFIP/OSHA; per-trade federal applicability declared in the trade registry).
- NEC editions (2014/2017/2020/2023) handled like IRC/IBC, including the
  nearest-*older* fallback. Never fall forward.

**Hard render invariant:** a library entry missing `section` or `source_url`
is rejected at load/build time and cannot reach a report. This is the
structural backstop for zero-hallucination.

### D. Report build & data model

- `cm_reports` gains `trades text[]` (the selected trades).
- `cm_requirements` rows gain `trade`, `source_url`, `confidence`,
  `verified_at`, `edition` (in addition to existing `category`, `code_source`,
  `section`, `requirement`, `trigger`, `sort_order`, `notes`).
- Build flow (`cmreport.py` + `serve.py` report endpoints): for each selected
  trade → resolve discipline edition (Section B) → `requirements_for(trade,
  code, edition)` → hazard overlay where relevant → attach rows tagged with the
  trade and its resolved citation provenance.

### E. UI — `dashboard/template.html`

- Report-create flow gains a **multi-select trade picker** (chips), defaulting
  to none-selected (user must pick at least one).
- The resolve preview shows, **per selected trade**, the resolved code +
  edition + confidence + verified date (or the "AHJ-confirm" flag).
- The "No library coverage → blank report" dead-end becomes **per-trade and
  informative**: e.g. "Exterior — IRC 2021 R703: 14 requirements; Electrical —
  NEC edition adopted per AHJ, confirm locally." Manual blank-report creation
  remains available as an explicit choice, never the only path.
- Living-blueprint / Apple×Fieldcam aesthetic preserved.

### F. PDF — `cmreport.py` + `cm_report_template.html`

- **Per-trade sections**, each headed with that trade's resolved code +
  edition + verified date (or AHJ-confirm note).
- All existing `LIBRARY_DISCLAIMERS` retained; a per-trade edition-confidence
  disclaimer added where the adoption is AHJ-confirm rather than verified.
- **New Sources & Citations page**: every requirement listed with code,
  edition, section, `source_url`, `verified_at`, and `confidence`; plus the
  per-discipline adoption sources used. This is the cite page William asked
  for. Long URLs wrap (the existing overflow-wrap fix in the template).

### G. Audit harness — `bin/audit_library.py`

- **Structural audit:** every entry across all trade libraries has `section`,
  `summary`, `source_url`, `confidence`, `verified_at`; sections sort cleanly;
  no fall-forward editions; `_meta` present per file.
- **Link-check mode:** flags any `source_url` that no longer resolves
  (network, opt-in).
- Exit non-zero on any structural violation so it can gate releases.
- Plus the render-time guard from Section C.

## Components & Interfaces

| Unit | Responsibility | Depends on |
|------|----------------|------------|
| `bin/trades.py` | Trade taxonomy: id, label, discipline, code/chapter map, federal applicability | — |
| `cm_discipline_adoptions` (table) | Per-discipline adopted code/edition, granular to jurisdiction, with provenance | migration |
| `bin/cmadoption.py` | Resolve discipline edition from FIPS stack (place→county→state→AHJ-confirm) | `cm_discipline_adoptions`, `jurisdiction.py` |
| `bin/cmlibrary.py` (extended) | Trade-aware cited requirements; render invariant | `data/research/library/*.json` |
| `data/research/library/*.json` | Per-trade researched, cited requirement entries | research |
| `cmreport.py` / `serve.py` (extended) | Build per-trade report rows with provenance | above |
| `dashboard/template.html` (extended) | Trade picker + per-trade resolve preview | serve API |
| `cm_report_template.html` (extended) | Per-trade sections + Sources & Citations page | report data |
| `bin/audit_library.py` | Structural + link audit; release gate | library files |

## Data Flow

```
address/ZIP
  → jurisdiction.resolve()  → FIPS stack (state/county/place)
  → user-selected trades
  → for each trade:
       trade.discipline
       → cmadoption.resolve(discipline, FIPS stack)  → {code, edition, provenance | ahj_confirm}
       → cmlibrary.requirements_for(trade, code, edition)  → cited rows (render invariant enforced)
       → hazard overlay (where applicable)
  → cm_reports(trades[]) + cm_requirements(trade, provenance, …)
  → PDF: per-trade sections + Sources & Citations page
```

## Error Handling & Degradation

- No verified discipline adoption at any level → reference edition + AHJ-confirm
  flag; never a guessed year.
- Edition missing from a trade library → nearest-*older* edition with a
  `nearest-edition:` note (existing behavior); never fall forward.
- Library entry failing the render invariant → excluded + logged; report still
  renders the valid rows.
- Adoption store / Supabase down → resolver degrades like today's `/api/cm/resolve`
  (returns what it can; never 500s the whole report).

## Testing

- `bin/cmlibrary.py` self-test extended per trade (counts, fallback, invariant).
- `bin/cmadoption.py` unit tests: place > county > state precedence; AHJ-confirm
  sentinel when unverified; confidence/verified_at passthrough.
- `bin/audit_library.py` run green on all shipped trade libraries.
- End-to-end: a multi-trade report for a real address renders per-trade
  sections + a complete citations page; an unverified-discipline address shows
  AHJ-confirm honestly.
- Keyless: no Stripe/Supabase service key required for the library/audit/render
  unit tests.

## Risks & Flags

- **Shared-prod Supabase migration** (`cm_discipline_adoptions`,
  `cm_reports.trades`, `cm_requirements` columns) — additive/reversible. SQL
  shown to William; **applied only on his explicit per-action approval** per the
  suite guardrail. Nothing applied during planning.
- **Deep research is the long pole and the accuracy gate.** The build ships the
  rails + Exterior; remaining trades + the per-discipline adoption corpus land
  as same-shape data drops. We render only what is verified.
- **NEC (electrical) is a separate SDO** with its own editions and adoption
  cycle — handled last, with its own edition keys and adoption rows.
- **Federal layer applicability** differs by trade — declared per trade, not
  auto-attached.

## Build Sequence

1. Rails: `bin/trades.py`, trade-aware `cmlibrary.py`, library file split
   (roofing migrated unchanged), render invariant, `audit_library.py`.
2. `cm_discipline_adoptions` migration (SQL → approval → apply) + `cmadoption.py`
   resolver + Exterior/Mechanical/Plumbing/Electrical state baselines as
   research lands.
3. Report build + data-model columns; trade picker UI; per-trade resolve preview.
4. PDF per-trade sections + **Sources & Citations page**.
5. Exterior trade library researched + shipped as the proof; audit green;
   end-to-end verified.
6. Mechanical → Plumbing → Electrical libraries + adoption data as subsequent
   drops on the same rails.
