import json
import unittest
from datetime import date
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data" / "competitor_pricing.json"
SEAT_MODELS = {"PER_SEAT", "FLAT_SEAT_CAP", "FLAT_CONCURRENCY", "FLAT_ANNUAL", "QUOTE_ONLY", "OWN"}
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

    def test_not_both_monthly_and_annual_set(self):
        """A tier prices EITHER per-month OR as an annual total, never both."""
        for vendor, tier in _iter_tiers(self.doc):
            if tier["monthlyCents"] is not None and tier["annualTotalCents"] is not None:
                self.fail(f"{vendor['id']}/{tier['name']} sets both monthlyCents and annualTotalCents")

    def test_money_is_int_cents(self):
        for vendor, tier in _iter_tiers(self.doc):
            for field in ("monthlyCents", "annualTotalCents", "additionalSeatCents"):
                val = tier.get(field)
                if val is not None:
                    self.assertIsInstance(val, int, f"{vendor['id']}/{tier['name']}/{field}")


if __name__ == "__main__":
    unittest.main()
