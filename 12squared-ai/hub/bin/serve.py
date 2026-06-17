#!/usr/bin/env python3
"""12² AI Hub — umbrella web app (sign in, launch products, see jobs, owner metrics).

Same proven stack as HailScan: Python stdlib ThreadingHTTPServer + a single-file
vanilla-JS dashboard + Supabase (GoTrue auth, PostgREST data via service key).
Reads the canonical core_* surface. No weather/SPC code.

Routes
  GET  /                      -> redirect to /app
  GET  /app | /dashboard      -> the dashboard shell (template.html)
  GET  /signin                -> sign-in page
  GET  /reset                 -> password-recovery landing page (reset.html)
  GET  /api/me                -> {user, orgs, products, is_platform_admin}
  GET  /api/launcher          -> product tiles (entitled + deep link)
  GET  /api/jobs              -> shared core_jobs for the caller's org(s)
  GET  /api/jobs/<id>         -> one job + every product's deliverables
  GET  /api/admin/metrics     -> [platform admin] suite + per-business metrics
  GET  /api/admin/metrics/org/<id> -> [platform admin] one-org drill-down
  GET  /api/admin/orgs        -> [platform admin] org directory
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import threading
import time
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs

def _load_env_file() -> None:
    """Load KEY=VALUE lines from hub/.env (if present) into os.environ — the
    service-role key is server-side only and must never be entered through a
    UI. Real environment variables win over the file. Must run before
    entitlements/hubdata/provision import (they read env at import time)."""
    env_path = Path(__file__).resolve().parent.parent / ".env"
    try:
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, val = line.split("=", 1)
            os.environ.setdefault(key.strip(), val.strip().strip('"').strip("'"))
    except FileNotFoundError:
        pass


_load_env_file()

sys.path.insert(0, str(Path(__file__).resolve().parent))
from auth import verify_supabase_jwt, AuthError  # noqa: E402
import entitlements  # noqa: E402
import hubdata  # noqa: E402
import admin_metrics  # noqa: E402
import provision  # noqa: E402
import billing  # noqa: E402
import billing_events  # noqa: E402

DASHBOARD = Path(__file__).resolve().parent.parent / "dashboard"
TEMPLATE = DASHBOARD / "template.html"
COMPETITOR_DATA = Path(__file__).resolve().parent.parent / "data" / "competitor_pricing.json"


def load_competitor_pricing() -> dict:
    """Read the verified competitor-pricing JSON. Raises on missing/invalid file."""
    return json.loads(COMPETITOR_DATA.read_text())


SIGNIN = DASHBOARD / "signin.html"
RESET = DASHBOARD / "reset.html"
# The public marketing landing page is served same-origin so its "Sign in"
# (/app) links resolve to this hub. Falls back to the /app redirect if absent.
LANDING = Path(__file__).resolve().parent.parent.parent / "landing"

_CT = {".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript",
       ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp",
       ".svg": "image/svg+xml", ".mp4": "video/mp4", ".ico": "image/x-icon", ".woff2": "font/woff2"}

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://eitnccqaysidqvgudeeb.supabase.co").rstrip("/")
SUPABASE_ANON_KEY = os.environ.get(
    "SUPABASE_ANON_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpdG5jY3FheXNpZHF2Z3VkZWViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0NjAzODYsImV4cCI6MjA5NjAzNjM4Nn0.i9-7j0USLioV_p-ZKCfWTHS9SOxv54R1Jqg0lDTH94g",
)
SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", "")
SUPABASE_JWKS_URL = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json" if SUPABASE_URL else ""
# Owner-facing: identity matters, so auth is ON by default when a verifier exists.
REQUIRE_AUTH = (
    os.environ.get("HUB_REQUIRE_AUTH", "1" if (SUPABASE_JWKS_URL or SUPABASE_JWT_SECRET) else "0") == "1"
)

PUBLIC_API_PATHS: set[str] = set()


class _IPRateLimiter:
    """Per-IP rolling-window limiter: `limit` hits per `window` seconds."""

    def __init__(self, limit: int, window: float):
        self.limit, self.window = limit, window
        self._lock = threading.Lock()
        self._hits: dict[str, list[float]] = {}

    def allow(self, ip: str) -> bool:
        """True (and records the hit) if `ip` is under the cap."""
        now = time.time()
        with self._lock:
            hits = [t for t in self._hits.get(ip, ()) if now - t < self.window]
            allowed = len(hits) < self.limit
            if allowed:
                hits.append(now)
            self._hits[ip] = hits
            if len(self._hits) > 2048:  # keep the table bounded
                for k in [k for k, v in self._hits.items()
                          if not v or now - v[-1] > self.window]:
                    self._hits.pop(k, None)
            return allowed


# Public self-signup is reachable at https://hub.fieldcam.app/api/signup; cap it
# per real client IP (5 / hour) so a single address can't spray account creation.
_signup_limiter = _IPRateLimiter(5, 3600.0)

# Behind Cloudflare Tunnel every TCP peer is 127.0.0.1 — honor the edge's
# client-IP headers ONLY when the operator says a trusted proxy fronts us
# (default OFF so the headers can't be spoofed on direct connections).
HUB_TRUSTED_PROXY = os.environ.get("HUB_TRUSTED_PROXY", "0") == "1"


def _entitled_org_ids(c) -> list[str]:
    """Orgs through which the caller may see job data: orgs holding >=1 active
    product entitlement. An org whose entitlements all lapsed keeps its account
    (/api/me, launcher) but loses the data surface. Platform admins keep all."""
    if getattr(c, "is_platform_admin", False):
        return list(c.org_ids)
    return [o for o in c.org_ids if c.products.get(o)]


def render_shell() -> str:
    config = {
        "supabaseUrl": SUPABASE_URL or "https://eitnccqaysidqvgudeeb.supabase.co",
        "supabaseAnonKey": SUPABASE_ANON_KEY,
        "requireAuth": REQUIRE_AUTH,
        "devAdmin": admin_metrics.DEV_ADMIN_ENABLED,
    }
    return TEMPLATE.read_text().replace("__HUB_CONFIG__", json.dumps(config))


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt: str, *args) -> None:
        print(f"  {self.address_string()} {fmt % args}", flush=True)

    def _real_client_ip(self) -> str:
        """Rate-limit key. With HUB_TRUSTED_PROXY=1, prefer the Cloudflare edge's
        CF-Connecting-IP (the true client), falling back to the last
        X-Forwarded-For hop only if it's absent; otherwise use the direct TCP
        peer so the header can't be spoofed. Behind the Cloudflare tunnel the TCP
        peer is always 127.0.0.1 and the last X-Forwarded-For hop is the CF edge
        IP, so keying on it would collapse every client into one bucket."""
        if HUB_TRUSTED_PROXY:
            cf = (self.headers.get("CF-Connecting-IP") or "").strip()
            if cf:
                return cf
            xff = (self.headers.get("X-Forwarded-For") or "").strip()
            if xff:
                return xff.split(",")[-1].strip() or self.client_address[0]
        return self.client_address[0]

    # --- response helpers ----------------------------------------------------
    def _send_json(self, status: int, payload) -> None:
        body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_html(self, status: int, html: str) -> None:
        body = html.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_file(self, fp: Path) -> bool:
        """Serve a static file from the landing dir. Returns False if missing."""
        try:
            data = fp.read_bytes()
        except (FileNotFoundError, IsADirectoryError, OSError):
            return False
        self.send_response(200)
        self.send_header("Content-Type", _CT.get(fp.suffix.lower(), "application/octet-stream"))
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)
        return True

    def _serve_landing(self, rel: str) -> bool:
        """Serve the landing page (rel='') or one of its assets, path-traversal safe."""
        base = LANDING.resolve()
        target = (base / (rel or "index.html")).resolve()
        if base != target and base not in target.parents:
            return False  # escape attempt
        return self._send_file(target)

    def _redirect(self, location: str) -> None:
        self.send_response(302)
        self.send_header("Location", location)
        self.end_headers()

    def _json_body(self) -> dict:
        length = int(self.headers.get("Content-Length", "0") or "0")
        raw = self.rfile.read(length) if length else b"{}"
        return json.loads(raw or b"{}")

    # --- auth + caller -------------------------------------------------------
    def _authenticate(self) -> bool:
        if not REQUIRE_AUTH:
            return True
        header = self.headers.get("Authorization", "")
        if not header.lower().startswith("bearer "):
            self._send_json(401, {"error": "authentication required"})
            return False
        token = header[7:].strip()
        try:
            self.user_claims = verify_supabase_jwt(
                token, secret=SUPABASE_JWT_SECRET or None, jwks_url=SUPABASE_JWKS_URL or None,
            )
            return True
        except AuthError as e:
            self._send_json(401, {"error": f"invalid token: {e}"})
            return False

    def _bearer(self) -> str | None:
        h = self.headers.get("Authorization", "")
        return h[7:].strip() if h.lower().startswith("bearer ") else None

    def _caller(self):
        if getattr(self, "_caller_cache", None) is not None:
            return self._caller_cache
        claims = getattr(self, "user_claims", None) or {}
        try:
            c = entitlements.resolve(claims.get("sub"), self._bearer(), claims.get("email"))
        except entitlements.EntitlementError as e:
            self._send_json(503, {"error": f"entitlement backend unavailable: {e}"})
            self._caller_cache = False
            return None
        self._caller_cache = c
        return c

    def _require_admin(self):
        c = self._caller()
        if c is None:
            return None  # 503 already sent
        if not admin_metrics.admin_allowed(c):
            self._send_json(403, {"error": "platform admin access required"})
            return None
        return c

    # --- self-serve products (contract identical to Fieldcam serve.py) --------
    def _products_caller(self):
        """Caller for the /api/products surface: requires a real identity even
        when HUB_REQUIRE_AUTH is off. Sends the error and returns None on fail."""
        claims = getattr(self, "user_claims", None) or {}
        if not claims.get("sub"):
            self._send_json(401, {"error": "authentication required"})
            return None
        return self._caller()  # sends its own 503 on entitlement-backend failure

    def handle_products_get(self) -> None:
        """GET /api/products — catalog + the caller's entitled products."""
        c = self._products_caller()
        if c is None:
            return
        self._send_json(200, {
            "products": entitlements.PRODUCT_CATALOG,
            "entitled": sorted(c.all_products),
        })

    def handle_products_add(self) -> None:
        """POST /api/products/add {"product": ...} — owner/admin self-serve trial.
        Reuses provision.grant_entitlement (merge upsert on org_id,product)."""
        try:
            body = self._json_body()
        except (ValueError, json.JSONDecodeError) as e:
            self._send_json(400, {"error": f"bad json: {e}"}); return
        product = (body.get("product") or "").strip().lower()
        if product not in entitlements.PRODUCTS:
            self._send_json(400, {
                "error": f"unknown product; expected one of: {', '.join(entitlements.PRODUCTS)}",
            }); return
        caller = self._products_caller()
        if caller is None:
            return
        if not provision.configured():
            self._send_json(503, {
                "error": "Self-serve product add is not available: the server is "
                         "missing SUPABASE_SERVICE_ROLE_KEY.",
            }); return
        if not caller.org_ids:
            self._send_json(403, {
                "error": "no_org",
                "message": "No organization is associated with this account yet.",
            }); return
        org_id = caller.primary_org_id  # first owner/admin org, else first org
        if caller.roles.get(org_id) not in ("owner", "admin"):
            self._send_json(403, {
                "error": "ask_admin",
                "message": "Only an organization owner or admin can add products. "
                           "Ask your administrator to add it.",
            }); return
        try:
            # Never overwrite a live entitlement: any existing non-terminal
            # status (active, trialing, past_due, …) is left untouched so
            # self-serve add can't mask billing state (idempotent 200). Only
            # absent or terminal (canceled/inactive) rows get a fresh trial.
            current = entitlements.entitlement_status(org_id, product, token=self._bearer())
            if current in (None, "", "canceled", "cancelled", "inactive"):
                status = "trialing"
                provision.grant_entitlement(org_id, product, status="trialing",
                                            source="self_serve")
            else:
                status = current
        except (provision.ProvisionError, entitlements.EntitlementError) as e:
            self._send_json(502, {"error": str(e)}); return
        entitlements.invalidate(caller.user_id)
        try:
            updated = entitlements.resolve(caller.user_id, self._bearer(), caller.email)
            products = sorted(updated.all_products)
        except entitlements.EntitlementError:
            products = sorted(caller.all_products | {product})
        self._send_json(200, {"ok": True, "product": product,
                              "status": status, "products": products})

    def handle_billing_webhook(self, product: str) -> None:
        """POST /api/billing/webhook/<product> — Stripe events for that
        product's account. Public path; the HMAC signature IS the auth."""
        secret = billing.webhook_secret_for(product)
        if not secret:
            self._send_json(503, {"error": "billing webhook not configured"}); return
        try:
            length = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            length = 0
        if length <= 0 or length > 1_000_000:
            self._send_json(400, {"error": "bad payload"}); return
        payload = self.rfile.read(length)  # raw bytes — hash before any parse
        try:
            event = billing.verify_webhook(
                payload, self.headers.get("Stripe-Signature", ""), secret)
        except billing.SignatureError as e:
            self._send_json(400, {"error": f"signature: {e}"}); return
        try:
            billing_events.handle(product, event)
        except Exception as e:
            # 500 → Stripe retries; the event ledger makes retries safe.
            print(f"[billing] webhook {product} {event.get('type')}: {e}", flush=True)
            self._send_json(500, {"error": "handler error"}); return
        self._send_json(200, {"received": True})

    # --- routing -------------------------------------------------------------
    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        path = parsed.path
        params = parse_qs(parsed.query)

        if path == "/":
            # Serve the marketing landing page same-origin (so its /app links work).
            if self._serve_landing(""):
                return
            self._redirect("/app")  # fallback if the landing dir is absent
            return
        if path.startswith("/assets/"):
            if self._serve_landing("assets/" + path[len("/assets/"):]):
                return
            self._send_json(404, {"error": "not found"}); return
        if path == "/favicon.ico":
            if self._serve_landing("favicon.ico"):
                return
            self._send_json(404, {"error": "not found"}); return
        if path in ("/app", "/app/", "/dashboard", "/dashboard/"):
            self._send_html(200, render_shell())
            return
        if path in ("/signin", "/signin/", "/login", "/login/"):
            self._send_html(200, SIGNIN.read_text())
            return
        if path in ("/reset", "/reset/"):
            # Password-recovery landing page: GoTrue redirects the emailed link
            # here with tokens in the URL fragment. Same config injection as
            # render_shell (needs the anon key for PUT /auth/v1/user).
            config = {"supabaseUrl": SUPABASE_URL or "https://eitnccqaysidqvgudeeb.supabase.co",
                      "supabaseAnonKey": SUPABASE_ANON_KEY}
            self._send_html(200, RESET.read_text().replace("__HUB_CONFIG__", json.dumps(config)))
            return
        if path == "/healthz":
            self._send_json(200, {"ok": True, "service": "12squared-hub"})
            return
        if path == "/competitors.js":
            if not self._send_file(DASHBOARD / "competitors.js"):
                self._send_json(404, {"error": "not found"})
            return

        if path.startswith("/api/") and path not in PUBLIC_API_PATHS and not self._authenticate():
            return

        if path == "/api/me":
            c = self._caller()
            if c is not None:
                self._send_json(200, c.to_me())
            return
        if path == "/api/launcher":
            c = self._caller()
            if c is not None:
                self._send_json(200, {"products": hubdata.launcher(c)})
            return
        if path == "/api/products":
            self.handle_products_get()
            return
        if path == "/api/jobs":
            c = self._caller()
            if c is not None:
                orgs = _entitled_org_ids(c)
                if not orgs:
                    self._send_json(403, {"error": "no active product on this account",
                                          "code": "not_entitled"}); return
                try:
                    self._send_json(200, {"jobs": hubdata.jobs_for_orgs(orgs)})
                except hubdata.HubDataError as e:
                    self._send_json(503, {"error": str(e)})
            return
        if path.startswith("/api/jobs/"):
            c = self._caller()
            if c is not None:
                orgs = _entitled_org_ids(c)
                if not orgs:
                    self._send_json(403, {"error": "no active product on this account",
                                          "code": "not_entitled"}); return
                job_id = path[len("/api/jobs/"):].strip("/")
                try:
                    job = hubdata.job_detail(job_id, orgs)
                except hubdata.HubDataError as e:
                    self._send_json(503, {"error": str(e)})
                    return
                self._send_json(200 if job else 404, job or {"error": "not found"})
            return

        # --- platform-admin surface ---
        if path == "/api/admin/metrics":
            if self._require_admin() is not None:
                try:
                    self._send_json(200, admin_metrics.metrics())
                except hubdata.HubDataError as e:
                    self._send_json(503, {"error": str(e)})
            return
        if path.startswith("/api/admin/metrics/org/"):
            if self._require_admin() is not None:
                oid = path[len("/api/admin/metrics/org/"):].strip("/")
                self._send_json(200, admin_metrics.org_detail(oid))
            return
        if path == "/api/admin/orgs":
            if self._require_admin() is not None:
                try:
                    self._send_json(200, {"orgs": hubdata.get("core_orgs", {"select": "id,name,created_at"})})
                except hubdata.HubDataError as e:
                    self._send_json(503, {"error": str(e)})
            return
        if path == "/api/admin/competitors":
            if self._require_admin() is not None:
                try:
                    self._send_json(200, load_competitor_pricing())
                except (OSError, ValueError) as e:
                    self._send_json(503, {"error": f"competitor data unavailable: {e}"})
            return

        self._send_json(404, {"error": "not found"})

    def do_POST(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        path = parsed.path

        # Public self-signup (no auth): create the user + provision a product trial.
        if path == "/api/signup":
            try:
                body = self._json_body()
            except (ValueError, json.JSONDecodeError) as e:
                self._send_json(400, {"error": f"bad json: {e}"}); return
            email = (body.get("email") or "").strip()
            password = body.get("password") or ""
            if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
                self._send_json(400, {"error": "valid email required"}); return
            if len(password) < 8:
                self._send_json(400, {"error": "password must be at least 8 characters"}); return
            # rate-limit AFTER validation so bad input doesn't burn a slot; signup
            # provisions real GoTrue users + orgs, so it gets a stricter cap. Key
            # on the real client IP (CF-Connecting-IP behind the tunnel), not the
            # 127.0.0.1 tunnel peer.
            if not _signup_limiter.allow(self._real_client_ip()):
                self._send_json(429, {"error": "too many signup attempts from this "
                                               "address — try again in an hour"}); return
            try:
                res = provision.signup(
                    email,
                    password,
                    (body.get("product") or "fieldcam").strip(),
                    org_name=(body.get("org_name") or None),
                )
                entitlements.invalidate(res.get("user_id"))
                self._send_json(200, {"ok": True, **res})
            except provision.ProvisionError as e:
                self._send_json(400, {"error": str(e)})
            return

        # Stripe webhooks (public; authenticated by HMAC signature, not a JWT).
        # One path per product — each product bills from its own Stripe account
        # with its own webhook signing secret.
        _wh = re.match(r"^/api/billing/webhook/(fieldcam|hailscan|codesandmore)$", path)
        if _wh:
            self.handle_billing_webhook(_wh.group(1))
            return

        if path.startswith("/api/") and path not in PUBLIC_API_PATHS and not self._authenticate():
            return

        # Self-serve add-on: an org owner/admin adds a product trial to their own
        # org. The entitlement gate is a conversion surface, not a wall.
        if path == "/api/products/add":
            self.handle_products_add()
            return

        # Platform-admin: grant an existing user an org + product entitlement.
        if path == "/api/admin/provision":
            if self._require_admin() is None:
                return
            try:
                body = self._json_body()
            except (ValueError, json.JSONDecodeError) as e:
                self._send_json(400, {"error": f"bad json: {e}"}); return
            email = (body.get("email") or "").strip()
            user_id = body.get("user_id")
            try:
                if not user_id:
                    user_id = provision.find_auth_user(email)
                if not user_id:
                    self._send_json(404, {"error": "user not found; have them sign up first"}); return
                res = provision.provision(
                    user_id, email or None, (body.get("product") or "").strip(),
                    org_name=(body.get("org_name") or None),
                    status=(body.get("status") or "active").strip(),
                )
                entitlements.invalidate(user_id)
                self._send_json(200, {"ok": True, **res})
            except provision.ProvisionError as e:
                self._send_json(400, {"error": str(e)})
            return

        # Cross-org share a job: grant another org read/edit on one address.
        _share = re.match(r"^/api/jobs/([0-9a-fA-F-]{8,})/share$", path)
        if _share:
            c = self._caller()
            if c is None:
                return
            job_id = _share.group(1)
            try:
                body = self._json_body()
            except (ValueError, json.JSONDecodeError) as e:
                self._send_json(400, {"error": f"bad json: {e}"}); return
            try:
                owned = hubdata.get("core_jobs", {"select": "org_id", "id": f"eq.{job_id}"})
                if not owned:
                    self._send_json(404, {"error": "job not found"}); return
                owner_org = owned[0]["org_id"]
                if owner_org not in _entitled_org_ids(c):
                    self._send_json(403, {"error": "only the owning org can share this job"}); return
                target = body.get("org_id")
                if not target and body.get("email"):
                    uid = provision.find_auth_user(body["email"].strip())
                    target = hubdata.org_for_user(uid) if uid else None
                if not target:
                    self._send_json(404, {"error": "share target org not found (pass org_id or a member's email)"}); return
                role = "editor" if body.get("role") == "editor" else "viewer"
                share = hubdata.create_job_share(job_id, owner_org, target, role, (c.email or c.user_id))
                self._send_json(200, {"ok": True, "share": share})
            except hubdata.HubDataError as e:
                self._send_json(503, {"error": str(e)})
            return

        self._send_json(404, {"error": "not found"})


def main() -> int:
    parser = argparse.ArgumentParser(description="Run the 12² AI Hub server.")
    parser.add_argument("--port", type=int, default=8770)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--no-open", action="store_true")
    args = parser.parse_args()

    server = ThreadingHTTPServer((args.host, args.port), Handler)
    url = f"http://localhost:{args.port}/app"
    print(f"  12² Hub serving at {url}")
    print(f"  auth={'on' if REQUIRE_AUTH else 'off'}  dev_admin={'on' if admin_metrics.DEV_ADMIN_ENABLED else 'off'}"
          f"  service_key={'set' if hubdata.configured() else 'MISSING'}")
    if not args.no_open:
        threading.Timer(0.5, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  shutting down")
        server.shutdown()
    return 0


if __name__ == "__main__":
    sys.exit(main())
