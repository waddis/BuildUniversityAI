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
const own = {
  seatModel: "OWN",
  tiers: [{ name: "Fieldcam", monthlyCents: 4900, quoteOnly: false }],
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

test("OWN returns first non-quote tier's monthlyCents, independent of N", () => {
  assert.equal(C.costAtUsers(own, 1).monthlyCents, 4900);
  assert.equal(C.costAtUsers(own, 100).monthlyCents, 4900);
  assert.equal(C.costAtUsers(own, 1).tierName, "Fieldcam");
});

test("fmtMoney formats whole and fractional dollars", () => {
  assert.equal(C.fmtMoney(7900), "$79");
  assert.equal(C.fmtMoney(8325), "$83.25");
  assert.equal(C.fmtMoney(null), "—");
});

test("daysSince computes calendar days", () => {
  assert.equal(C.daysSince("2026-04-15", "2026-06-17"), 63);
});

const hailtraceFlat = {
  seatModel: "FLAT_ANNUAL",
  tiers: [
    { name: "Free", monthlyCents: 0, annualTotalCents: null, quoteOnly: false },
    { name: "Maps Only", monthlyCents: null, annualTotalCents: null, quoteOnly: true },
    { name: "Maps & Data", monthlyCents: null, annualTotalCents: 500000, quoteOnly: false },
  ],
};

test("FLAT_ANNUAL is annual/12, independent of N, skips the $0 Free tier", () => {
  assert.equal(C.costAtUsers(hailtraceFlat, 1).monthlyCents, Math.round(500000 / 12)); // 41667
  assert.equal(C.costAtUsers(hailtraceFlat, 100).monthlyCents, Math.round(500000 / 12));
  assert.equal(C.costAtUsers(hailtraceFlat, 10).tierName, "Maps & Data"); // not "Free"
});

test("stackTotals: one competitor per category, no hail double-count", () => {
  const doc = {
    twelveSquared: [
      { name: "Fieldcam", category: "photo_docs", seatModel: "OWN",
        tiers: [{ name: "Fieldcam", monthlyCents: 4900, quoteOnly: false }] },
      { name: "HailScan", category: "hail_data", seatModel: "OWN",
        tiers: [{ name: "Single State", monthlyCents: 14900, quoteOnly: false }] },
      { name: "Codes&More", category: "code_reports", seatModel: "OWN",
        tiers: [{ name: "Codes&More", monthlyCents: 9900, quoteOnly: false }] },
    ],
    competitors: [
      { name: "CompanyCam", category: "photo_docs", seatModel: "PER_SEAT",
        tiers: [{ name: "Pro", monthlyCents: 7900, includedSeats: 3, additionalSeatCents: 2900, quoteOnly: false }] },
      { name: "Interactive Hail Maps", category: "hail_data", seatModel: "FLAT_CONCURRENCY",
        tiers: [{ name: "One State", monthlyCents: null, annualTotalCents: 99900, concurrency: 5, quoteOnly: false }] },
      { name: "HailTrace", category: "hail_data", seatModel: "FLAT_ANNUAL", tiers: hailtraceFlat.tiers },
      { name: "One Click Code", category: "code_reports", seatModel: "FLAT_SEAT_CAP",
        tiers: [{ name: "Pro", monthlyCents: 4900, seatCap: 50, quoteOnly: false }] },
    ],
  };
  const t = C.stackTotals(doc, 10);
  assert.equal(t.suite.totalCents, 4900 + 14900 + 9900);          // 29700
  assert.equal(t.stack.totalCents, 28200 + 8325 + 4900);          // 41425 (IHM is cheapest hail)
  assert.equal(t.savingsCents, 41425 - 29700);                    // 11725
  assert.equal(t.savingsPct, 28);
  // HailTrace ($416.67) is the pricier hail option -> alternative, not summed
  assert.equal(t.stack.alternatives.length, 1);
  assert.equal(t.stack.alternatives[0].name, "HailTrace");
  assert.equal(t.stack.quoteOnly.length, 0);
});
