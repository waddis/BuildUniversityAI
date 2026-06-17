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
