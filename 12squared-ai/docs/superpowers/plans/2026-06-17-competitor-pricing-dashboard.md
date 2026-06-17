# Competitor Pricing Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a platform-admin-only "Competitors" tab to the 12² HUB that compares verified competitor pricing/seat models against the 12² suite, with native + normalized-to-N-users cost math, battlecards, and recommendations.

**Architecture:** A git-tracked JSON file (`hub/data/competitor_pricing.json`) is the source of truth — no scraping. A pure JS normalization engine (`hub/dashboard/competitors.js`) computes "cost at N users" per seat model and is unit-tested under node. The Python stdlib server gains one gated read-only API route plus a static route for the JS. The existing single-file vanilla-JS SPA (`hub/dashboard/template.html`) gains one tab.

**Tech Stack:** Python 3 stdlib `http.server` (backend), vanilla JS (frontend), Supabase JWT auth (existing), `node --test` (JS tests), `python3 -m unittest` (schema/route tests). No new runtime dependencies.

## Global Constraints

- **No price may render without a `sourceUrl` AND `lastVerified` date** — enforced by the schema test (Task 1). Copied verbatim from spec §2.
- **No scraping, no live fetch, no in-UI price editing.** Edits = edit JSON + git commit (spec §9).
- **Access:** platform-admin only — reuse the existing `_require_admin()` gate (spec §3).
- **Quote-only tiers** (`quoteOnly: true`) MUST have null `monthlyCents` AND null `annualTotalCents`, and render "Contact sales" (spec §3).
- **Money is stored in integer cents.** `monthlyCents` = effective price per month; `annualTotalCents` = full-year total, set ONLY for annual-only vendors.
- **No new pip/npm dependencies.** Tests use stdlib `unittest` and built-in `node:test`/`node:assert`.
- **Follow the existing dark-theme vanilla-JS SPA pattern** in `template.html` (nav button + `view-*` section + loader fn). Do not introduce a framework.
- **Default reference team size = 10; slider range 1–100** (spec §5).
- Repo git root is `/Users/williamaddis` (the home dir); the project lives at `/Users/williamaddis/12squared-ai/`. Run all commands from `/Users/williamaddis/12squared-ai/hub/` unless stated otherwise.

---

### Task 1: Verified pricing data file + schema test

**Files:**
- Create: `hub/data/competitor_pricing.json`
- Create: `hub/tests/test_competitor_schema.py`

**Interfaces:**
- Consumes: nothing.
- Produces: `competitor_pricing.json` with top-level keys `schemaVersion` (int), `stalenessWarnDays` (int), `twelveSquared` (array of vendor objects), `competitors` (array of vendor objects). Vendor object: `{id, name, category, competesWith[], url, pricingPublic, seatModel, tiers[], notes, gaps[], whyWeWin[]}`. Tier object: `{name, monthlyCents|null, annualTotalCents|null, billingUnit, includedSeats, additionalSeatCents, seatCap|null, features[], overage, quoteOnly, concurrency|null, sourceUrl, lastVerified, confidence}`. `seatModel` ∈ `{"PER_SEAT","FLAT_SEAT_CAP","FLAT_CONCURRENCY","QUOTE_ONLY","OWN"}`. `confidence` ∈ `{"verified","archive","quote","internal"}`.

- [ ] **Step 1: Write the failing schema test**

Create `hub/tests/test_competitor_schema.py`:

```python
import json
import unittest
from datetime import date
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data" / "competitor_pricing.json"
SEAT_MODELS = {"PER_SEAT", "FLAT_SEAT_CAP", "FLAT_CONCURRENCY", "QUOTE_ONLY", "OWN"}
CONFIDENCE = {"verified", "archive", "quote", "internal"}
CATEGORIES = {"photo_docs", "hail_data", "code_reports"}


def _iter_tiers(doc):
    for vendor in doc["twelveSquared"] + doc["competitors"]:
        for tier in vendor["tiers"]:
            yield vendor, tier


class TestCompetitorSchema(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.doc = json.loads(DATA.read_text())

    def test_top_level_keys(self):
        for key in ("schemaVersion", "stalenessWarnDays", "twelveSquared", "competitors"):
            self.assertIn(key, self.doc)
        self.assertIsInstance(self.doc["competitors"], list)
        self.assertTrue(self.doc["competitors"])

    def test_vendor_fields(self):
        for vendor in self.doc["twelveSquared"] + self.doc["competitors"]:
            self.assertIn(vendor["category"], CATEGORIES, vendor.get("id"))
            self.assertIn(vendor["seatModel"], SEAT_MODELS, vendor.get("id"))
            self.assertIsInstance(vendor["competesWith"], list)
            self.assertTrue(vendor["tiers"], f"{vendor['id']} has no tiers")

    def test_priced_tiers_have_source_and_date(self):
        """The accuracy constraint: any non-null price needs a source URL and an ISO date."""
        for vendor, tier in _iter_tiers(self.doc):
            priced = tier["monthlyCents"] is not None or tier["annualTotalCents"] is not None
            if priced:
                self.assertTrue(tier["sourceUrl"], f"{vendor['id']}/{tier['name']} missing sourceUrl")
                # raises ValueError if not ISO YYYY-MM-DD:
                date.fromisoformat(tier["lastVerified"])
                self.assertIn(tier["confidence"], CONFIDENCE)

    def test_quote_only_tiers_have_no_price(self):
        for vendor, tier in _iter_tiers(self.doc):
            if tier["quoteOnly"]:
                self.assertIsNone(tier["monthlyCents"], f"{vendor['id']}/{tier['name']}")
                self.assertIsNone(tier["annualTotalCents"], f"{vendor['id']}/{tier['name']}")

    def test_money_is_int_cents(self):
        for vendor, tier in _iter_tiers(self.doc):
            for field in ("monthlyCents", "annualTotalCents", "additionalSeatCents"):
                val = tier.get(field)
                if val is not None:
                    self.assertIsInstance(val, int, f"{vendor['id']}/{tier['name']}/{field}")


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /Users/williamaddis/12squared-ai/hub && python3 -m unittest tests.test_competitor_schema -v`
Expected: FAIL/ERROR — `FileNotFoundError` for `competitor_pricing.json` (file does not exist yet).

- [ ] **Step 3: Create the data file with verified seed data**

Create `hub/data/competitor_pricing.json`. All competitor numbers are from the 2026-06-17 research pass; Interactive Hail Maps is archive-sourced (`confidence: "archive"`, dated 2026-04-15); HailTrace is quote-only; 12² own prices are seeded from `bin/admin_metrics.py` and marked `confidence: "internal"` (owner to confirm — spec §10).

```json
{
  "schemaVersion": 1,
  "stalenessWarnDays": 60,
  "twelveSquared": [
    {
      "id": "fieldcam", "name": "Fieldcam", "category": "photo_docs",
      "competesWith": ["companycam"], "url": "internal", "pricingPublic": false,
      "seatModel": "OWN",
      "tiers": [
        {"name": "Fieldcam", "monthlyCents": 4900, "annualTotalCents": null,
         "billingUnit": "month", "includedSeats": null, "additionalSeatCents": null,
         "seatCap": null, "features": ["field photo/video docs", "projects", "share links"],
         "overage": null, "quoteOnly": false, "concurrency": null,
         "sourceUrl": "internal:bin/admin_metrics.py", "lastVerified": "2026-06-17",
         "confidence": "internal"}
      ],
      "notes": "Seed from admin_metrics ADDON_PRICE_CENTS; owner to confirm seat model.",
      "gaps": [], "whyWeWin": []
    },
    {
      "id": "hailscan", "name": "HailScan", "category": "hail_data",
      "competesWith": ["interactivehailmaps", "hailtrace"], "url": "internal", "pricingPublic": false,
      "seatModel": "OWN",
      "tiers": [
        {"name": "Single State", "monthlyCents": 14900, "annualTotalCents": null,
         "billingUnit": "month", "includedSeats": null, "additionalSeatCents": null,
         "seatCap": null, "features": ["1 state hail monitoring"], "overage": null,
         "quoteOnly": false, "concurrency": null, "sourceUrl": "internal:bin/admin_metrics.py",
         "lastVerified": "2026-06-17", "confidence": "internal"},
        {"name": "Three State", "monthlyCents": 29900, "annualTotalCents": null,
         "billingUnit": "month", "includedSeats": null, "additionalSeatCents": null,
         "seatCap": null, "features": ["3 states"], "overage": null, "quoteOnly": false,
         "concurrency": null, "sourceUrl": "internal:bin/admin_metrics.py",
         "lastVerified": "2026-06-17", "confidence": "internal"},
        {"name": "Nationwide", "monthlyCents": 79900, "annualTotalCents": null,
         "billingUnit": "month", "includedSeats": null, "additionalSeatCents": null,
         "seatCap": null, "features": ["nationwide"], "overage": null, "quoteOnly": false,
         "concurrency": null, "sourceUrl": "internal:bin/admin_metrics.py",
         "lastVerified": "2026-06-17", "confidence": "internal"}
      ],
      "notes": "Seed from admin_metrics TIER_PRICE_CENTS; owner to confirm.",
      "gaps": [], "whyWeWin": []
    },
    {
      "id": "codesandmore", "name": "Codes&More", "category": "code_reports",
      "competesWith": ["oneclickcode"], "url": "internal", "pricingPublic": false,
      "seatModel": "OWN",
      "tiers": [
        {"name": "Codes&More", "monthlyCents": 9900, "annualTotalCents": null,
         "billingUnit": "month", "includedSeats": null, "additionalSeatCents": null,
         "seatCap": null, "features": ["building-code reports"], "overage": null,
         "quoteOnly": false, "concurrency": null, "sourceUrl": "internal:bin/admin_metrics.py",
         "lastVerified": "2026-06-17", "confidence": "internal"}
      ],
      "notes": "Seed from admin_metrics ADDON_PRICE_CENTS; owner to confirm.",
      "gaps": [], "whyWeWin": []
    }
  ],
  "competitors": [
    {
      "id": "companycam", "name": "CompanyCam", "category": "photo_docs",
      "competesWith": ["fieldcam"], "url": "https://companycam.com/pricing",
      "pricingPublic": true, "seatModel": "PER_SEAT",
      "tiers": [
        {"name": "Pro", "monthlyCents": 7900, "annualTotalCents": null,
         "billingUnit": "month_billed_annually", "includedSeats": 3, "additionalSeatCents": 2900,
         "seatCap": null, "features": ["unlimited projects/storage", "basic checklists", "PDF reports"],
         "overage": null, "quoteOnly": false, "concurrency": null,
         "sourceUrl": "https://companycam.com/pricing", "lastVerified": "2026-06-17",
         "confidence": "verified"},
        {"name": "Premium", "monthlyCents": 12900, "annualTotalCents": null,
         "billingUnit": "month_billed_annually", "includedSeats": 3, "additionalSeatCents": 2900,
         "seatCap": null, "features": ["unlimited AI actions", "custom templates", "company dashboard"],
         "overage": null, "quoteOnly": false, "concurrency": null,
         "sourceUrl": "https://companycam.com/pricing", "lastVerified": "2026-06-17",
         "confidence": "verified"},
        {"name": "Elite", "monthlyCents": 19900, "annualTotalCents": null,
         "billingUnit": "month_billed_annually", "includedSeats": 3, "additionalSeatCents": 2900,
         "seatCap": null, "features": ["payments", "e-signatures", "review collection", "LiDAR"],
         "overage": null, "quoteOnly": false, "concurrency": null,
         "sourceUrl": "https://companycam.com/pricing", "lastVerified": "2026-06-17",
         "confidence": "verified"},
        {"name": "Enterprise", "monthlyCents": null, "annualTotalCents": null,
         "billingUnit": "quote", "includedSeats": null, "additionalSeatCents": null,
         "seatCap": null, "features": ["50+ employees"], "overage": null, "quoteOnly": true,
         "concurrency": null, "sourceUrl": "https://companycam.com/pricing",
         "lastVerified": "2026-06-17", "confidence": "quote"}
      ],
      "notes": "Prices are annual-billing per-month; flat base includes 3 users. Monthly-billing base (~$34/user) not published.",
      "gaps": ["no hail/storm data", "no building-code reports"],
      "whyWeWin": ["12² bundles photo docs + hail + code in one subscription", "no 3-user floor"]
    },
    {
      "id": "oneclickcode", "name": "One Click Code", "category": "code_reports",
      "competesWith": ["codesandmore"], "url": "https://www.oneclickcode.com/pricing",
      "pricingPublic": true, "seatModel": "FLAT_SEAT_CAP",
      "tiers": [
        {"name": "Pro", "monthlyCents": 4900, "annualTotalCents": null, "billingUnit": "month",
         "includedSeats": null, "additionalSeatCents": null, "seatCap": 50,
         "features": ["30 jurisdiction / 8 code / 4 weather reports"], "overage": "$2 juris / $10 code",
         "quoteOnly": false, "concurrency": null, "sourceUrl": "https://www.oneclickcode.com/pricing",
         "lastVerified": "2026-06-17", "confidence": "verified"},
        {"name": "Premium", "monthlyCents": 11500, "annualTotalCents": null, "billingUnit": "month",
         "includedSeats": null, "additionalSeatCents": null, "seatCap": null,
         "features": ["60 / 20 / 20 reports", "unlimited seats"], "overage": "$2 juris / $10 code",
         "quoteOnly": false, "concurrency": null, "sourceUrl": "https://www.oneclickcode.com/pricing",
         "lastVerified": "2026-06-17", "confidence": "verified"},
        {"name": "Small Business", "monthlyCents": 24900, "annualTotalCents": null, "billingUnit": "month",
         "includedSeats": null, "additionalSeatCents": null, "seatCap": null,
         "features": ["50 code / 50 weather"], "overage": "$8/report", "quoteOnly": false,
         "concurrency": null, "sourceUrl": "https://help.oneclickcode.com/understanding-our-business-plan-tiers-options",
         "lastVerified": "2026-06-17", "confidence": "verified"},
        {"name": "Medium Business", "monthlyCents": 49900, "annualTotalCents": null, "billingUnit": "month",
         "includedSeats": null, "additionalSeatCents": null, "seatCap": null,
         "features": ["100 / 100"], "overage": "$7/report", "quoteOnly": false, "concurrency": null,
         "sourceUrl": "https://help.oneclickcode.com/understanding-our-business-plan-tiers-options",
         "lastVerified": "2026-06-17", "confidence": "verified"},
        {"name": "Large Business", "monthlyCents": 98900, "annualTotalCents": null, "billingUnit": "month",
         "includedSeats": null, "additionalSeatCents": null, "seatCap": null,
         "features": ["200 / 200"], "overage": "$6/report", "quoteOnly": false, "concurrency": null,
         "sourceUrl": "https://help.oneclickcode.com/understanding-our-business-plan-tiers-options",
         "lastVerified": "2026-06-17", "confidence": "verified"}
      ],
      "notes": "Flat per-tier, NO per-seat charge. Pro caps at 50 seats; Premium+ unlimited. Annual $ not published (only % savings). Domain is .com not .io.",
      "gaps": ["no photo documentation", "no hail/storm mapping"],
      "whyWeWin": ["12² bundles code + hail + photo docs", "single suite subscription"]
    },
    {
      "id": "interactivehailmaps", "name": "Interactive Hail Maps", "category": "hail_data",
      "competesWith": ["hailscan"], "url": "https://www.interactivehailmaps.com/pricing-page/",
      "pricingPublic": true, "seatModel": "FLAT_CONCURRENCY",
      "tiers": [
        {"name": "One State", "monthlyCents": null, "annualTotalCents": 99900, "billingUnit": "year",
         "includedSeats": null, "additionalSeatCents": null, "seatCap": null,
         "features": ["1 state/region", "10+ yrs history", "contact data", "radar alerts"],
         "overage": null, "quoteOnly": false, "concurrency": 5,
         "sourceUrl": "https://web.archive.org/web/20260415/https://www.interactivehailmaps.com/pricing-page/",
         "lastVerified": "2026-04-15", "confidence": "archive"},
        {"name": "Three State", "monthlyCents": null, "annualTotalCents": 149900, "billingUnit": "year",
         "includedSeats": null, "additionalSeatCents": null, "seatCap": null,
         "features": ["any 3 regions", "everything in One State"], "overage": null,
         "quoteOnly": false, "concurrency": 5,
         "sourceUrl": "https://web.archive.org/web/20260415/https://www.interactivehailmaps.com/pricing-page/",
         "lastVerified": "2026-04-15", "confidence": "archive"},
        {"name": "Nationwide", "monthlyCents": null, "annualTotalCents": 199900, "billingUnit": "year",
         "includedSeats": null, "additionalSeatCents": null, "seatCap": null,
         "features": ["nationwide", "everything"], "overage": null, "quoteOnly": false, "concurrency": 5,
         "sourceUrl": "https://web.archive.org/web/20260415/https://www.interactivehailmaps.com/pricing-page/",
         "lastVerified": "2026-04-15", "confidence": "archive"}
      ],
      "notes": "Concurrency-based (5 simultaneous sessions, not headcount). Annual-only by geographic footprint. Live site blocks bots; figures from 2026-04-15 archive — spot-check before relying. Extra concurrency is phone-quote-only.",
      "gaps": ["no photo documentation", "no building-code reports"],
      "whyWeWin": ["12² priced per-month, not annual-lock", "bundled with photo docs + code"]
    },
    {
      "id": "hailtrace", "name": "HailTrace", "category": "hail_data",
      "competesWith": ["hailscan"], "url": "https://hailtrace.com/plans",
      "pricingPublic": false, "seatModel": "QUOTE_ONLY",
      "tiers": [
        {"name": "Free", "monthlyCents": 0, "annualTotalCents": null, "billingUnit": "month",
         "includedSeats": null, "additionalSeatCents": null, "seatCap": null,
         "features": ["limited maps/data"], "overage": null, "quoteOnly": false, "concurrency": null,
         "sourceUrl": "https://hailtrace.com/plans", "lastVerified": "2026-06-17", "confidence": "verified"},
        {"name": "Maps Only", "monthlyCents": null, "annualTotalCents": null, "billingUnit": "quote",
         "includedSeats": null, "additionalSeatCents": null, "seatCap": null,
         "features": ["maps"], "overage": null, "quoteOnly": true, "concurrency": null,
         "sourceUrl": "https://hailtrace.com/plans", "lastVerified": "2026-06-17", "confidence": "quote"},
        {"name": "Maps & Data", "monthlyCents": null, "annualTotalCents": null, "billingUnit": "quote",
         "includedSeats": null, "additionalSeatCents": null, "seatCap": null,
         "features": ["maps + data"], "overage": null, "quoteOnly": true, "concurrency": null,
         "sourceUrl": "https://hailtrace.com/plans", "lastVerified": "2026-06-17", "confidence": "quote"},
        {"name": "Enterprise", "monthlyCents": null, "annualTotalCents": null, "billingUnit": "quote",
         "includedSeats": null, "additionalSeatCents": null, "seatCap": null,
         "features": ["custom"], "overage": null, "quoteOnly": true, "concurrency": null,
         "sourceUrl": "https://hailtrace.com/plans", "lastVerified": "2026-06-17", "confidence": "quote"}
      ],
      "notes": "All paid tiers are quote-only — no public price. Do NOT populate dollar figures. Third-party numbers are unverifiable/fabricated.",
      "gaps": ["no public pricing (friction)", "no photo docs", "no code reports"],
      "whyWeWin": ["12² publishes transparent pricing", "all-in-one suite"]
    }
  ]
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd /Users/williamaddis/12squared-ai/hub && python3 -m unittest tests.test_competitor_schema -v`
Expected: PASS — all 5 tests OK.

- [ ] **Step 5: Commit**

```bash
cd /Users/williamaddis
git add 12squared-ai/hub/data/competitor_pricing.json 12squared-ai/hub/tests/test_competitor_schema.py
git commit -m "12² HUB: verified competitor pricing data + schema test"
```

---

### Task 2: Seat-normalization engine (`competitors.js`)

**Files:**
- Create: `hub/dashboard/competitors.js`
- Create: `hub/tests/competitors.test.mjs`

**Interfaces:**
- Consumes: tier objects from Task 1 (`monthlyCents`, `annualTotalCents`, `includedSeats`, `additionalSeatCents`, `seatCap`, `concurrency`, `quoteOnly`), and the vendor's `seatModel`.
- Produces (global `window.Competitors` in browser; `module.exports` under node):
  - `costAtUsers(vendor, n) -> { monthlyCents: number|null, tierName: string|null, explanation: string, seatMath: string }` — picks the relevant tier and computes monthly cost for `n` users.
  - `fmtMoney(cents) -> string` (e.g. `7900 -> "$79"`, `8350 -> "$83.50"`; `null -> "—"`).
  - `daysSince(isoDate, todayIso) -> number`.

Notes on per-model logic (spec §4):
- **PER_SEAT:** for each tier, `monthly = monthlyCents + max(0, n - includedSeats) * additionalSeatCents`. `costAtUsers` reports the **lowest-named (first) priced tier** (Pro) as the comparison baseline. seatMath shows the arithmetic.
- **FLAT_SEAT_CAP:** choose the cheapest tier whose `seatCap` is null (unlimited) or `>= n`; cost = that tier's `monthlyCents` (independent of n until cap forces upgrade).
- **FLAT_CONCURRENCY:** use the first tier; `monthly = round(annualTotalCents / 12)`, independent of n.
- **QUOTE_ONLY / OWN-with-quote:** if the chosen tier is `quoteOnly`, return `monthlyCents: null`.
- **OWN:** treat like a flat single price — first non-quote tier's `monthlyCents`, independent of n.

- [ ] **Step 1: Write the failing tests**

Create `hub/tests/competitors.test.mjs`:

```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const C = require("../dashboard/competitors.js");

const companycam = {
  seatModel: "PER_SEAT",
  tiers: [{ name: "Pro", monthlyCents: 7900, includedSeats: 3, additionalSeatCents: 2900,
            seatCap: null, quoteOnly: false }],
};
const oneclick = {
  seatModel: "FLAT_SEAT_CAP",
  tiers: [{ name: "Pro", monthlyCents: 4900, seatCap: 50, quoteOnly: false },
          { name: "Premium", monthlyCents: 11500, seatCap: null, quoteOnly: false }],
};
const ihm = {
  seatModel: "FLAT_CONCURRENCY",
  tiers: [{ name: "One State", monthlyCents: null, annualTotalCents: 99900, concurrency: 5, quoteOnly: false }],
};
const hailtrace = {
  seatModel: "QUOTE_ONLY",
  tiers: [{ name: "Maps Only", monthlyCents: null, annualTotalCents: null, quoteOnly: true }],
};

test("PER_SEAT includes 3 then +$29/user", () => {
  assert.equal(C.costAtUsers(companycam, 1).monthlyCents, 7900);
  assert.equal(C.costAtUsers(companycam, 3).monthlyCents, 7900);
  assert.equal(C.costAtUsers(companycam, 5).monthlyCents, 7900 + 2 * 2900);   // 13700
  assert.equal(C.costAtUsers(companycam, 10).monthlyCents, 7900 + 7 * 2900);  // 28200
  assert.equal(C.costAtUsers(companycam, 100).monthlyCents, 7900 + 97 * 2900);
});

test("FLAT_SEAT_CAP picks cheapest fitting tier; upgrades past cap", () => {
  assert.equal(C.costAtUsers(oneclick, 1).monthlyCents, 4900);
  assert.equal(C.costAtUsers(oneclick, 50).monthlyCents, 4900);
  assert.equal(C.costAtUsers(oneclick, 51).monthlyCents, 11500); // Pro cap exceeded -> Premium
  assert.equal(C.costAtUsers(oneclick, 51).tierName, "Premium");
  assert.equal(C.costAtUsers(oneclick, 100).monthlyCents, 11500);
});

test("FLAT_CONCURRENCY is annual/12, independent of N", () => {
  assert.equal(C.costAtUsers(ihm, 1).monthlyCents, C.costAtUsers(ihm, 100).monthlyCents);
  assert.equal(C.costAtUsers(ihm, 10).monthlyCents, Math.round(99900 / 12)); // 8325
});

test("QUOTE_ONLY returns null", () => {
  assert.equal(C.costAtUsers(hailtrace, 10).monthlyCents, null);
});

test("fmtMoney formats whole and fractional dollars", () => {
  assert.equal(C.fmtMoney(7900), "$79");
  assert.equal(C.fmtMoney(8325), "$83.25");
  assert.equal(C.fmtMoney(null), "—");
});

test("daysSince computes calendar days", () => {
  assert.equal(C.daysSince("2026-04-15", "2026-06-17"), 63);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd /Users/williamaddis/12squared-ai/hub && node --test tests/competitors.test.mjs`
Expected: FAIL — cannot find module `../dashboard/competitors.js`.

- [ ] **Step 3: Write the engine**

Create `hub/dashboard/competitors.js`:

```javascript
(function (root) {
  function fmtMoney(cents) {
    if (cents === null || cents === undefined) return "—";
    const dollars = cents / 100;
    return Number.isInteger(dollars) ? "$" + dollars : "$" + dollars.toFixed(2);
  }

  function daysSince(isoDate, todayIso) {
    const a = new Date(isoDate + "T00:00:00Z").getTime();
    const b = new Date(todayIso + "T00:00:00Z").getTime();
    return Math.round((b - a) / 86400000);
  }

  function firstPriced(tiers) {
    return tiers.find(t => !t.quoteOnly &&
      (t.monthlyCents !== null || t.annualTotalCents !== null)) || tiers[0];
  }

  function costAtUsers(vendor, n) {
    const model = vendor.seatModel;
    if (model === "PER_SEAT") {
      const t = firstPriced(vendor.tiers);
      const extra = Math.max(0, n - (t.includedSeats || 0));
      const monthly = t.monthlyCents + extra * (t.additionalSeatCents || 0);
      const inc = t.includedSeats || 0;
      return { monthlyCents: monthly, tierName: t.name,
        explanation: `${t.name}: base incl. ${inc} users, +${fmtMoney(t.additionalSeatCents)}/user`,
        seatMath: `${fmtMoney(t.monthlyCents)} base (incl. ${inc}) + ${extra} × ${fmtMoney(t.additionalSeatCents)} = ${fmtMoney(monthly)}/mo at ${n} users` };
    }
    if (model === "FLAT_SEAT_CAP") {
      const fitting = vendor.tiers
        .filter(t => !t.quoteOnly && t.monthlyCents !== null && (t.seatCap === null || t.seatCap >= n))
        .sort((a, b) => a.monthlyCents - b.monthlyCents)[0];
      if (!fitting) return { monthlyCents: null, tierName: null,
        explanation: "no tier covers this team size", seatMath: "contact sales" };
      return { monthlyCents: fitting.monthlyCents, tierName: fitting.name,
        explanation: `${fitting.name}: flat, no per-seat charge`,
        seatMath: `flat ${fmtMoney(fitting.monthlyCents)}/mo (${fitting.name}${fitting.seatCap ? ", up to " + fitting.seatCap + " seats" : ", unlimited seats"})` };
    }
    if (model === "FLAT_CONCURRENCY") {
      const t = firstPriced(vendor.tiers);
      const monthly = Math.round(t.annualTotalCents / 12);
      return { monthlyCents: monthly, tierName: t.name,
        explanation: `${t.name}: annual, ${t.concurrency} concurrent sessions (not per-user)`,
        seatMath: `${fmtMoney(t.annualTotalCents)}/yr ÷ 12 = ${fmtMoney(monthly)}/mo · ${t.concurrency} concurrent (not per-user)` };
    }
    if (model === "OWN") {
      const t = firstPriced(vendor.tiers);
      if (t.quoteOnly || t.monthlyCents === null)
        return { monthlyCents: null, tierName: t.name, explanation: "internal", seatMath: "—" };
      return { monthlyCents: t.monthlyCents, tierName: t.name,
        explanation: `${t.name}`, seatMath: `${fmtMoney(t.monthlyCents)}/mo` };
    }
    // QUOTE_ONLY and anything else
    return { monthlyCents: null, tierName: null,
      explanation: "Contact sales — no public price", seatMath: "Contact sales" };
  }

  const api = { costAtUsers, fmtMoney, daysSince };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Competitors = api;
})(typeof window !== "undefined" ? window : this);
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd /Users/williamaddis/12squared-ai/hub && node --test tests/competitors.test.mjs`
Expected: PASS — 6 tests pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/williamaddis
git add 12squared-ai/hub/dashboard/competitors.js 12squared-ai/hub/tests/competitors.test.mjs
git commit -m "12² HUB: seat-normalization engine + unit tests"
```

---

### Task 3: Backend route + static JS serving

**Files:**
- Modify: `hub/bin/serve.py` (add competitors API route after line 460; add `/competitors.js` static route in the GET dispatcher; confirm `DASHBOARD` Path constant exists near line 64)
- Create: `hub/tests/test_competitors_route.py`

**Interfaces:**
- Consumes: `competitor_pricing.json` (Task 1), `self._require_admin()` and `self._send_json()` (existing in `serve.py`), `_CT`/`_send_file` (existing).
- Produces: `GET /api/admin/competitors` → `200` with the parsed JSON doc for platform admins; `403` otherwise; `503 {"error": ...}` if the file is missing/invalid. `GET /competitors.js` → the JS file with `text/javascript` content type.

- [ ] **Step 1: Add a data-loading helper near the top of `serve.py`**

In `hub/bin/serve.py`, just after the `TEMPLATE = DASHBOARD / "template.html"` line (around line 64), add:

```python
COMPETITOR_DATA = Path(__file__).resolve().parent.parent / "data" / "competitor_pricing.json"


def load_competitor_pricing() -> dict:
    """Read the verified competitor-pricing JSON. Raises on missing/invalid file."""
    return json.loads(COMPETITOR_DATA.read_text())
```

(`Path` and `json` are already imported in this file — verify at the top before adding; do not re-import.)

- [ ] **Step 2: Write the failing route test**

Create `hub/tests/test_competitors_route.py`:

```python
import json
import unittest
from pathlib import Path
import importlib.util

SERVE = Path(__file__).resolve().parent.parent / "bin" / "serve.py"


def _load_serve():
    spec = importlib.util.spec_from_file_location("hubserve", SERVE)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class TestCompetitorsRoute(unittest.TestCase):
    def test_loader_returns_doc_with_competitors(self):
        mod = _load_serve()
        doc = mod.load_competitor_pricing()
        self.assertIn("competitors", doc)
        self.assertTrue(any(v["id"] == "companycam" for v in doc["competitors"]))

    def test_route_is_registered_and_admin_gated(self):
        """The dispatcher source must gate /api/admin/competitors behind _require_admin."""
        src = SERVE.read_text()
        self.assertIn('"/api/admin/competitors"', src)
        # the competitors route block must call the admin gate
        idx = src.index('"/api/admin/competitors"')
        self.assertIn("_require_admin", src[idx:idx + 400])

    def test_static_js_route_registered(self):
        src = SERVE.read_text()
        self.assertIn('"/competitors.js"', src)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd /Users/williamaddis/12squared-ai/hub && python3 -m unittest tests.test_competitors_route -v`
Expected: FAIL — `load_competitor_pricing` exists (Step 1) so the first test may pass, but `test_route_is_registered_and_admin_gated` and `test_static_js_route_registered` FAIL (routes not added yet).

- [ ] **Step 4: Add the routes to the GET dispatcher**

In `hub/bin/serve.py`, immediately after the `/api/admin/orgs` block (ends at line 460, `return`), add:

```python
        if path == "/api/admin/competitors":
            if self._require_admin() is not None:
                try:
                    self._send_json(200, load_competitor_pricing())
                except (OSError, ValueError) as e:
                    self._send_json(503, {"error": f"competitor data unavailable: {e}"})
            return
```

Then, in the same `do_GET` method among the static/page routes (after the `/reset` block around line 391, before the `/api/` auth gate at line 397), add the public static JS route:

```python
        if path == "/competitors.js":
            if not self._send_file(DASHBOARD / "competitors.js"):
                self._send_json(404, {"error": "not found"})
            return
```

(`DASHBOARD` is the existing dashboard-dir Path constant; `_send_file` already sets `text/javascript` via `_CT`.)

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd /Users/williamaddis/12squared-ai/hub && python3 -m unittest tests.test_competitors_route -v`
Expected: PASS — all 3 tests OK.

- [ ] **Step 6: Smoke-test the server boots**

Run: `cd /Users/williamaddis/12squared-ai/hub && python3 -c "import importlib.util,pathlib; s=pathlib.Path('bin/serve.py'); spec=importlib.util.spec_from_file_location('hubserve',s); m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m); print('ok', bool(m.load_competitor_pricing()['competitors']))"`
Expected: prints `ok True` with no import/syntax errors.

- [ ] **Step 7: Commit**

```bash
cd /Users/williamaddis
git add 12squared-ai/hub/bin/serve.py 12squared-ai/hub/tests/test_competitors_route.py
git commit -m "12² HUB: gated /api/admin/competitors route + competitors.js serving"
```

---

### Task 4: Frontend tab — slider + comparison tables + freshness badges

**Files:**
- Modify: `hub/dashboard/template.html` (nav button line 207; new `view-competitors` section after the `view-admin` section near line 231; `<script src="/competitors.js">` before the inline `<script>` at line 302; `setTab` loader hook near line 409; new loader/render JS inside the inline script).

**Interfaces:**
- Consumes: `GET /api/admin/competitors` (Task 3), `window.Competitors.costAtUsers/fmtMoney/daysSince` (Task 2), existing `authedFetch`, `setTab`, `isAdmin`, `esc` helpers in `template.html`.
- Produces: `loadCompetitors()` global; a rendered tab with a live team-size slider and three category comparison tables.

- [ ] **Step 1: Add the nav button**

In `template.html`, after line 207 (the `Admin · Metrics` button), add:

```html
    <button data-tab="competitors" data-admin hidden>Admin · Competitors</button>
```

- [ ] **Step 2: Add the view section**

After the closing `</section>` of `view-admin` (near line 231), add:

```html
  <section class="view" id="view-competitors">
    <h2>Competitor Pricing</h2>
    <p class="sub">Verified public pricing vs. the 12² suite. No number appears without a source + date.</p>
    <div class="comp-controls">
      <label for="comp-users">Team size: <strong id="comp-users-val">10</strong> users</label>
      <input type="range" id="comp-users" min="1" max="100" value="10" step="1">
    </div>
    <div id="comp-banner" class="sub"></div>
    <div id="comp-wrap"><div class="empty">Loading…</div></div>
  </section>
```

- [ ] **Step 3: Load the engine script**

Immediately before the main inline `<script>` tag at line 302, add:

```html
<script src="/competitors.js"></script>
```

- [ ] **Step 4: Hook the loader into `setTab`**

In the `setTab` function, alongside the existing `if (name==='admin') loadAdmin();` (line 409), add:

```javascript
  if (name==='competitors') loadCompetitors();
```

- [ ] **Step 5: Add the loader + table renderer to the inline script**

Inside the main `<script>` block (e.g. after the `loadAdmin` function near line 604), add:

```javascript
let _compDoc = null;
const COMP_TODAY = new Date().toISOString().slice(0,10);
const CATS = [['photo_docs','Photo Documentation'],['hail_data','Hail / Storm Data'],['code_reports','Code Reports']];

async function loadCompetitors() {
  const wrap = document.querySelector('#comp-wrap');
  try {
    const r = await authedFetch('/api/admin/competitors');
    if (!r.ok) throw new Error((await r.json()).error || ('HTTP '+r.status));
    _compDoc = await r.json();
  } catch (e) {
    wrap.innerHTML = `<div class="empty err">${esc(e.message)}</div>`;
    return;
  }
  const slider = document.querySelector('#comp-users');
  slider.oninput = () => {
    document.querySelector('#comp-users-val').textContent = slider.value;
    renderCompetitors(+slider.value);
  };
  renderCompetitors(+slider.value);
}

function compBadge(tier) {
  const warnDays = _compDoc.stalenessWarnDays || 60;
  if (tier.confidence === 'quote') return '<span class="badge badge-grey">quote only</span>';
  if (tier.confidence === 'archive') return `<span class="badge badge-amber">from archive ${esc(tier.lastVerified)}</span>`;
  if (tier.confidence === 'internal') return '<span class="badge badge-grey">internal</span>';
  const age = Competitors.daysSince(tier.lastVerified, COMP_TODAY);
  if (age > warnDays) return `<span class="badge badge-amber">verify (${age}d old)</span>`;
  return `<span class="badge badge-green">verified ${esc(tier.lastVerified)}</span>`;
}

function vendorById(id) {
  return (_compDoc.twelveSquared.concat(_compDoc.competitors)).find(v => v.id === id);
}

function renderCompetitors(n) {
  const oldest = _compDoc.competitors.flatMap(v => v.tiers)
    .filter(t => t.confidence !== 'quote' && t.lastVerified)
    .map(t => t.lastVerified).sort()[0] || '—';
  document.querySelector('#comp-banner').innerHTML =
    `Oldest verified date: <strong>${esc(oldest)}</strong> · re-verify quote-only & archive sources in a browser before relying.`;

  let html = '';
  for (const [cat, label] of CATS) {
    const own = _compDoc.twelveSquared.filter(v => v.category === cat);
    const rivals = _compDoc.competitors.filter(v => v.category === cat);
    if (!own.length && !rivals.length) continue;
    html += `<h3>${esc(label)}</h3><table class="comp-table"><thead><tr>
      <th>Product</th><th>Native pricing</th><th>Cost @ ${n} users</th><th>Seat model</th><th>Verified</th><th>Source</th>
    </tr></thead><tbody>`;
    for (const v of own.concat(rivals)) {
      const c = Competitors.costAtUsers(v, n);
      const t0 = v.tiers[0];
      const native = v.tiers.map(t => t.quoteOnly ? `${esc(t.name)}: Contact sales`
        : `${esc(t.name)}: ${Competitors.fmtMoney(t.monthlyCents !== null ? t.monthlyCents : t.annualTotalCents)}${t.monthlyCents !== null ? '/mo' : '/yr'}`).join('<br>');
      const isOwn = v.seatModel === 'OWN';
      html += `<tr class="${isOwn ? 'comp-own' : ''}">
        <td><strong>${esc(v.name)}</strong>${isOwn ? ' <span class="badge badge-blue">12²</span>' : ''}</td>
        <td>${native}</td>
        <td title="${esc(c.seatMath)}">${Competitors.fmtMoney(c.monthlyCents)}${c.monthlyCents !== null ? '/mo' : ''}</td>
        <td>${esc(v.seatModel)}</td>
        <td>${compBadge(t0)}</td>
        <td>${t0.sourceUrl.startsWith('http') ? `<a href="${esc(t0.sourceUrl)}" target="_blank" rel="noopener">link</a>` : esc(t0.sourceUrl)}</td>
      </tr>`;
    }
    html += '</tbody></table>';
  }
  document.querySelector('#comp-wrap').innerHTML = html;
}
```

- [ ] **Step 6: Add minimal styles**

Inside the existing `<style>` block in `template.html` (append near the other rules), add:

```css
.comp-controls { margin: 12px 0; display: flex; align-items: center; gap: 12px; }
.comp-controls input[type=range] { flex: 1; max-width: 360px; }
.comp-table { width: 100%; border-collapse: collapse; margin: 8px 0 20px; }
.comp-table th, .comp-table td { text-align: left; padding: 8px 10px; border-bottom: 1px solid rgba(255,255,255,.08); vertical-align: top; }
.comp-own { background: rgba(80,140,255,.08); }
.badge { font-size: 11px; padding: 2px 6px; border-radius: 6px; white-space: nowrap; }
.badge-green { background: rgba(60,200,120,.18); color: #6f6; }
.badge-amber { background: rgba(240,180,60,.18); color: #fc6; }
.badge-grey  { background: rgba(160,160,160,.18); color: #bbb; }
.badge-blue  { background: rgba(80,140,255,.20); color: #9bf; }
```

- [ ] **Step 7: Manual verification in a browser**

```bash
cd /Users/williamaddis/12squared-ai/hub
HUB_ENABLE_DEV_ADMIN=1 python3 bin/serve.py --port 8770
```
Open `http://localhost:8770/app`, sign in as a platform admin, click **Admin · Competitors**. Verify: three category tables render; dragging the slider updates the "Cost @ N users" column live; CompanyCam at 10 users shows `$282/mo`; One Click Code shows `$49/mo` until you pass 50 then `$115/mo`; HailTrace rows show "Contact sales"; Interactive Hail Maps shows an amber "from archive 2026-04-15" badge. Stop the server with Ctrl-C.

- [ ] **Step 8: Commit**

```bash
cd /Users/williamaddis
git add 12squared-ai/hub/dashboard/template.html
git commit -m "12² HUB: Competitors tab — slider + normalized comparison tables"
```

---

### Task 5: Battlecards + recommendations panel

**Files:**
- Modify: `hub/dashboard/template.html` (extend the `renderCompetitors` function and the inline script with battlecard + recommendation rendering; add styles).

**Interfaces:**
- Consumes: `_compDoc`, `Competitors.costAtUsers/fmtMoney`, `vendorById` (Task 4).
- Produces: `renderBattlecards(n)` and `renderRecommendations(n)` appended to the tab; called from `renderCompetitors`.

- [ ] **Step 1: Call the new renderers from `renderCompetitors`**

At the end of `renderCompetitors(n)` (after the `#comp-wrap` assignment from Task 4), append:

```javascript
  document.querySelector('#comp-wrap').insertAdjacentHTML('beforeend', renderRecommendations(n));
  document.querySelector('#comp-wrap').insertAdjacentHTML('beforeend', renderBattlecards(n));
```

- [ ] **Step 2: Add the recommendations renderer**

In the inline script, add:

```javascript
function renderRecommendations(n) {
  let cards = '';
  for (const own of _compDoc.twelveSquared) {
    const ownCost = Competitors.costAtUsers(own, n);
    if (ownCost.monthlyCents === null) continue;
    for (const rivalId of own.competesWith) {
      const rival = vendorById(rivalId);
      if (!rival) continue;
      const rc = Competitors.costAtUsers(rival, n);
      let verdict;
      if (rc.monthlyCents === null) {
        verdict = `${esc(rival.name)} is quote-only — lead with 12²'s transparent ${Competitors.fmtMoney(ownCost.monthlyCents)}/mo.`;
      } else {
        const delta = rc.monthlyCents - ownCost.monthlyCents;
        verdict = delta > 0
          ? `12² is ${Competitors.fmtMoney(delta)}/mo cheaper than ${esc(rival.name)} at ${n} users.`
          : delta < 0
          ? `12² is ${Competitors.fmtMoney(-delta)}/mo more than ${esc(rival.name)} at ${n} users — justify with bundled scope.`
          : `12² matches ${esc(rival.name)} at ${n} users — win on bundled scope.`;
      }
      cards += `<div class="comp-rec"><strong>${esc(own.name)}</strong> vs ${esc(rival.name)}: ${verdict}</div>`;
    }
  }
  return `<h3>Recommendations @ ${n} users</h3>${cards || '<p class="sub">No priced comparison available.</p>'}`;
}
```

- [ ] **Step 3: Add the battlecards renderer**

```javascript
function renderBattlecards(n) {
  let cards = '';
  for (const v of _compDoc.competitors) {
    const c = Competitors.costAtUsers(v, n);
    const price = c.monthlyCents !== null ? `${Competitors.fmtMoney(c.monthlyCents)}/mo @ ${n}` : 'Contact sales';
    const gaps = (v.gaps || []).map(g => `<li>${esc(g)}</li>`).join('');
    const wins = (v.whyWeWin || []).map(w => `<li>${esc(w)}</li>`).join('');
    cards += `<div class="comp-card">
      <div class="comp-card-h"><strong>${esc(v.name)}</strong><span>${price}</span></div>
      <div class="sub">${esc(v.seatModel)} · ${esc(v.notes || '')}</div>
      ${gaps ? `<div class="comp-card-sec"><em>Gaps</em><ul>${gaps}</ul></div>` : ''}
      ${wins ? `<div class="comp-card-sec"><em>Why 12² wins</em><ul>${wins}</ul></div>` : ''}
    </div>`;
  }
  return `<h3>Battlecards</h3><div class="comp-cards">${cards}</div>`;
}
```

- [ ] **Step 4: Add styles**

In the `<style>` block, append:

```css
.comp-rec { padding: 8px 10px; border-left: 3px solid #9bf; margin: 6px 0; background: rgba(80,140,255,.06); }
.comp-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
.comp-card { border: 1px solid rgba(255,255,255,.10); border-radius: 10px; padding: 12px; }
.comp-card-h { display: flex; justify-content: space-between; margin-bottom: 4px; }
.comp-card-sec { margin-top: 8px; }
.comp-card-sec ul { margin: 4px 0 0; padding-left: 18px; }
```

- [ ] **Step 5: Manual verification**

```bash
cd /Users/williamaddis/12squared-ai/hub
HUB_ENABLE_DEV_ADMIN=1 python3 bin/serve.py --port 8770
```
Reload the Competitors tab. Verify: a "Recommendations @ N users" section appears (e.g. "Fieldcam vs CompanyCam: 12² is $233/mo cheaper at 10 users"); recommendation text and battlecard prices both update when the slider moves; HailTrace battlecard reads "Contact sales"; each card lists Gaps and "Why 12² wins". Stop the server.

- [ ] **Step 6: Run the full test suite**

```bash
cd /Users/williamaddis/12squared-ai/hub
python3 -m unittest discover -s tests -v && node --test tests/competitors.test.mjs
```
Expected: all Python tests pass and all node tests pass.

- [ ] **Step 7: Commit**

```bash
cd /Users/williamaddis
git add 12squared-ai/hub/dashboard/template.html
git commit -m "12² HUB: competitor battlecards + recommendations panel"
```

---

## Self-Review notes

- **Spec coverage:** §2 accuracy → Task 1 schema test; §3 data model + gated route → Tasks 1,3; §4 normalization (all four models + N boundaries) → Task 2 tests at N=1,3,5,10,50,51,100; §5 UI (slider/tables/battlecards/recommendations/freshness) → Tasks 4,5; §6 12² baseline → Task 1 `twelveSquared[]`; §7 error handling → Task 3 (503) + Task 4 (error state, quote/archive/stale badges); §8 testing → Tasks 1,2,3 + Task 5 Step 6.
- **Open items for owner (from spec §10):** the 12² seed prices are `confidence: "internal"` and the Interactive Hail Maps figures are `confidence: "archive"` — both surface in the UI as such and should be confirmed in a browser before relying on them. These are data-confirmation items, not code blockers.
