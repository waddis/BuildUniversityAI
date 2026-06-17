# 12² HUB — Competitor Pricing Dashboard

**Date:** 2026-06-17
**Status:** Design approved, pending spec review
**Owner:** William Addis
**Location:** `~/12squared-ai/hub/`

## 1. Purpose

Add a platform-admin-only **"Competitors"** tab to the 12² HUB that compares the
live-ish public pricing and seat models of four competitors against the 12² product
suite, serving two jobs at once:

1. **Internal pricing strategy** — see where 12² (Fieldcam / HailScan / Codes&More)
   sits versus each rival so prices can be set and adjusted with real recommendations.
2. **Sales battlecards** — a per-competitor "why 12² wins" reference for objection handling.

The four competitors and their 12²-product mapping:

| Category | 12² product | Competitor(s) |
|---|---|---|
| Photo documentation | Fieldcam | CompanyCam |
| Hail / storm data | HailScan | Interactive Hail Maps, HailTrace |
| Building-code reports | Codes&More | One Click Code (oneclickcode.**com**) |

## 2. Non-negotiable constraint: accuracy

**No price may ever appear in the UI without a source URL and a "last verified" date.**
This is enforced mechanically by a schema test (§8), not just by convention.

The market reality (verified 2026-06-17) makes a literal live-scraper impossible to keep
accurate, so we **do not scrape**. We use a curated, version-controlled JSON file that the
owner maintains, where each price cell is stamped with its source and verification date:

| Competitor | Public pricing? | Seat model | Handling |
|---|---|---|---|
| CompanyCam | Yes (Pro/Premium/Elite; Enterprise quote-only) | Flat base **incl. 3 users**, +$29/user (annual) | Real prices + dates |
| One Click Code | Yes ($49–$989/mo, no public annual $) | Flat, **no per-seat charge**; Pro ≤50 seats, others unlimited | Real prices + dates |
| Interactive Hail Maps | Yes, but site blocks bots (read via 2026-04-15 archive) | **Concurrency**: 5 simultaneous; extra = phone quote | Prices marked `confidence: "archive"` |
| HailTrace | **No** — quote-only on every paid tier | Not published | All tiers `quoteOnly` → "Contact sales" |

Quote-only and stale-data states are **first-class UI**, never blanks or guesses.

## 3. Architecture

```
hub/
├── data/
│   └── competitor_pricing.json     # NEW — source of truth (git-tracked = audit trail)
├── bin/
│   └── serve.py                    # +1 gated route: GET /api/admin/competitors
└── dashboard/
    ├── template.html               # + nav button, + view-competitors section, + loader
    └── competitors.js              # NEW — pure normalization engine + render helpers
```

**Source of truth = JSON file**, not Supabase. Rationale: the owner chose verified-data-with-dates;
a git-tracked file gives a built-in audit trail (every price change is a diff/commit),
guarantees no fabricated number can exist without a source, and needs zero new infra
(matches the stdlib/Supabase-only stack).

### Data model (`competitor_pricing.json`)

```jsonc
{
  "schemaVersion": 1,
  "stalenessWarnDays": 60,          // cells older than this get an amber badge
  "twelveSquared": [ /* same vendor shape; authoritative own-product prices */ ],
  "competitors": [
    {
      "id": "companycam",
      "name": "CompanyCam",
      "category": "photo_docs",       // photo_docs | hail_data | code_reports
      "competesWith": ["fieldcam"],   // 12² product id(s)
      "url": "https://companycam.com/pricing",
      "pricingPublic": true,
      "seatModel": "PER_SEAT",        // PER_SEAT | FLAT_SEAT_CAP | FLAT_CONCURRENCY | QUOTE_ONLY
      "tiers": [
        {
          "name": "Pro",
          "monthlyCents": 7900,        // effective price PER MONTH (incl. annual-billed-shown-monthly)
          "annualTotalCents": null,    // full-year total; set ONLY for annual-only vendors (e.g. IHM)
          "billingUnit": "month_billed_annually",
          "includedSeats": 3,
          "additionalSeatCents": 2900,
          "seatCap": null,             // null = unlimited
          "features": ["unlimited projects", "basic checklists", "PDF reports"],
          "overage": null,
          "quoteOnly": false,
          "sourceUrl": "https://companycam.com/pricing",
          "lastVerified": "2026-06-17",
          "confidence": "verified"     // verified | archive | quote
        }
      ],
      "notes": "Base prices are flat for 3 users; not per-seat headline.",
      "gaps": ["no hail data", "no code reports"],
      "whyWeWin": ["12² bundles photo docs + hail + code in one subscription"]
    }
  ]
}
```

**Field rules**
- Every tier with a non-null price MUST have `sourceUrl` and `lastVerified`.
- `quoteOnly: true` tiers MUST have null `monthlyCents`/`annualTotalCents` and render "Contact sales".
- `confidence` drives the badge: `verified` (green) / `archive` (amber "from archive") / `quote` (grey).

### Backend route

`GET /api/admin/competitors` — added in `serve.py` alongside the other `/api/admin/*` routes.
- Auth: ✓✓ platform-admin (reuses the existing `core_platform_admins` + `HUB_ENABLE_DEV_ADMIN`
  gate, identical to `/api/admin/metrics`).
- Behavior: read `hub/data/competitor_pricing.json`, parse, return as JSON.
- Errors: file missing / invalid JSON → `503 {"error": "..."}`; the frontend renders a clear
  error state and **never** a blank or guessed price.

## 4. Seat-normalization engine (`competitors.js`)

The accuracy-critical piece. Each vendor sells on a different unit, so "cost at N users"
needs per-model math, factored into **pure functions** (no DOM) so they are unit-testable
and the slider recomputes instantly client-side.

```
costAtUsers(vendor, tier, N) -> { monthlyCents: number|null, explanation: string, seatMath: string }
```

Per seat model:

- **PER_SEAT** (CompanyCam):
  `monthly = base + max(0, N - includedSeats) × additionalSeatCents`
  seatMath: `"$79 base (incl. 3) + 7 × $29 = $282/mo at 10 users"`.
  (Uses the annual per-user figure; note that monthly-billing per-seat (~$34) is not published — do not synthesize it.)

- **FLAT_SEAT_CAP** (One Click Code):
  cost does not rise with N; engine picks the **cheapest tier whose `seatCap` ≥ N**
  (Pro caps at 50 → N=51 forces Premium). `monthly = chosenTier.price`.
  seatMath: `"flat $49/mo (Pro, up to 50 seats)"` or `"N>50 → Premium $115/mo"`.

- **FLAT_CONCURRENCY** (Interactive Hail Maps):
  `monthly = annualTotalCents / 12`, **independent of N** (5 concurrent sessions ≠ headcount).
  seatMath: `"$999/yr ÷ 12 = $83/mo · 5 concurrent sessions (not per-user)"`.
  Never emit a fabricated per-seat number.

- **QUOTE_ONLY** (HailTrace):
  `monthlyCents: null`; explanation = `"Contact sales — no public price"`.

The engine always returns a `seatMath` string so the UI can **show its work** in a tooltip.

## 5. UI (interactive)

New tab `Admin · Competitors` (`data-admin hidden` nav button + `view-competitors` section),
following the existing dark-theme vanilla-JS pattern. Top to bottom:

1. **Team-size slider** — range 1–100, default **10**, live label. Recomputes all normalized
   columns on input. Plus a **freshness banner**: "Verified as of {oldest date} · re-verify in
   browser." Cells older than `stalenessWarnDays` show an amber badge.
2. **Three category blocks** — Photo Docs, Hail Data, Code Reports. Each is a table:
   the 12² product row + rival rows. Columns:
   *Native pricing* · *Normalized $/mo at N (seat-math tooltip)* · *Seat model* ·
   *Last-verified badge* · *Source link*.
3. **Battlecards** — one card per competitor: price summary, seat model, what's included,
   **gaps vs 12²**, curated **"why 12² wins"** bullets.
4. **Recommendations panel** — per 12² product, the computed delta at the current N
   (e.g. "At 10 users, Fieldcam $X vs CompanyCam $282/mo → 12² is $Y cheaper") plus a
   curated strategic note from the JSON.

## 6. 12² own pricing baseline

12²'s own prices live in the same JSON under `twelveSquared[]` (authoritative — own products),
so every comparison has a baseline. Seed values from the prices already in the repo
(`admin_metrics.py` tier/addon maps and Stripe-sourced amounts); any value that cannot be
confirmed from the repo is flagged in the spec/PR for the owner to fill rather than guessed.

## 7. Error handling

- Missing or malformed JSON → clear tab-level error; never blank, never a guessed price.
- A tier with `quoteOnly` or `confidence: "quote"` → "Contact sales" cell, no number.
- `confidence: "archive"` → amber "from archive ({date})" badge.
- Stale (`now − lastVerified > stalenessWarnDays`) → amber "verify" badge.
- Normalization returning `null` (quote-only) renders "—" in the normalized column with a tooltip.

## 8. Testing

- **Normalization unit tests** (node, pure functions): each seat model at
  **N = 1, 3, 5, 10, 50, 51, 100**, asserting exact cents and the tier-upgrade boundary
  (One Click Code Pro→Premium at N=51) and N-independence for FLAT_CONCURRENCY.
- **Schema test** (Python): loads `competitor_pricing.json` and asserts, for every tier,
  that a non-null price implies a non-empty `sourceUrl` **and** a valid ISO `lastVerified`
  date, and that `quoteOnly` tiers have null prices. This is the mechanical enforcement
  of the §2 accuracy constraint.
- **Route test**: `/api/admin/competitors` returns 401/403 without platform-admin, 200 with.

## 9. Out of scope (YAGNI)

- Live scraping or scheduled refresh (explicitly rejected — accuracy-first).
- In-UI editing of prices (edit the JSON + commit = the audit trail).
- Customer-facing exposure (platform-admin only).
- Historical price tracking beyond what git history already provides.

## 10. Open items for owner

- Confirm the four competitors' seed numbers against a live browser check before merge
  (esp. Interactive Hail Maps, which is archive-sourced, and CompanyCam monthly-billing prices).
- Provide/confirm authoritative 12² product prices for the `twelveSquared[]` baseline.
