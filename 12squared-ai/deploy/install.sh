#!/usr/bin/env bash
# 12² AI suite — one-time provisioning for a fresh Ubuntu 24.04 VPS.
# Run as root (or via sudo). Idempotent: safe to re-run.
#
#   sudo bash install.sh
#
# What it does:
#   - creates the `deploy` service user + home
#   - installs Python 3.13 (deadsnakes, to match the Mac exactly) + build deps
#   - installs the system libs Playwright/Chromium need
#   - DELIBERATELY does NOT install ffmpeg (no video rendering in prod)
#   - creates the shared venv at /home/deploy/suite-venv and installs the union
#     of every product's Python deps + Playwright Chromium
#   - installs cloudflared from Cloudflare's apt repo
#   - installs + enables the systemd units (does NOT start them — code/.env first)
#
# It does NOT deploy code (use deploy.sh) and does NOT create .env.local or the
# tunnel token (you scp those — see README.md).
set -euo pipefail

DEPLOY_USER=deploy
DEPLOY_HOME=/home/$DEPLOY_USER
VENV=$DEPLOY_HOME/suite-venv
PYBIN=python3.13
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ "$(id -u)" -ne 0 ]; then
  echo "ERROR: run as root (sudo bash install.sh)" >&2
  exit 1
fi

echo "==> [1/8] apt base + build deps"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y --no-install-recommends \
  ca-certificates curl gnupg lsb-release rsync git \
  build-essential pkg-config \
  libeccodes0 libeccodes-dev libgeos-dev \
  software-properties-common

echo "==> [2/8] Python 3.13 (deadsnakes, to match the Mac)"
# Ubuntu 24.04 ships Python 3.12. The suite code is 3.12-COMPATIBLE (stdlib +
# `from __future__ import annotations`, no PEP 695 / 3.13-only syntax — verified),
# so 3.12 is acceptable. We install 3.13 via deadsnakes to match the dev Mac
# exactly. To use the stock 3.12 instead, set PYBIN=python3.12 and skip this PPA.
if ! command -v "$PYBIN" >/dev/null 2>&1; then
  add-apt-repository -y ppa:deadsnakes/ppa
  apt-get update -y
  apt-get install -y --no-install-recommends \
    "$PYBIN" "$PYBIN-venv" "$PYBIN-dev"
fi

echo "==> [3/8] create service user '$DEPLOY_USER'"
if ! id -u "$DEPLOY_USER" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "$DEPLOY_USER"
fi
install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$DEPLOY_HOME/.cloudflared"

echo "==> [4/8] log dir"
install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" /var/log/12squared

echo "==> [5/8] shared venv at $VENV"
if [ ! -x "$VENV/bin/python" ]; then
  sudo -u "$DEPLOY_USER" "$PYBIN" -m venv "$VENV"
fi
sudo -u "$DEPLOY_USER" "$VENV/bin/python" -m pip install --upgrade pip wheel

echo "==> [6/8] install Python deps (union of all products) + Playwright Chromium"
# Hailscan carries the heavy scientific + Playwright stack. The other three
# (hub/fieldcam/codesandmore) are stdlib + PyJWT/cryptography/requests, which the
# hailscan requirements already pull in transitively for auth — but we install
# each product's requirements.txt explicitly when present, plus the shared auth
# deps, so a missing hailscan reqs file never silently drops PyJWT.
REQ_FILES=(
  "$DEPLOY_HOME/hailscan/requirements.txt"
  "$DEPLOY_HOME/12squared-ai/hub/requirements.txt"
  "$DEPLOY_HOME/12squared-ai/fieldcam/requirements.txt"
  "$DEPLOY_HOME/12squared-ai/codesandmore/requirements.txt"
)
PIP_ARGS=()
for f in "${REQ_FILES[@]}"; do
  if [ -f "$f" ]; then PIP_ARGS+=(-r "$f"); fi
done
# Shared backend deps used by every product's auth module (PyJWT + cryptography)
# and HTTP client. Pinned floors match the product requirements files.
PIP_ARGS+=("PyJWT>=2.8.0" "cryptography>=42.0.0" "requests>=2.31")
if [ "${#PIP_ARGS[@]}" -gt 0 ]; then
  sudo -u "$DEPLOY_USER" "$VENV/bin/python" -m pip install "${PIP_ARGS[@]}"
fi
# Chromium for the PDF report pipeline (Playwright). NOTE: no ffmpeg — video is
# disabled. playwright ships in hailscan/requirements.txt, so it is only present
# AFTER the product code is pushed (deploy.sh). On a first run before code exists
# this step is skipped (re-run install.sh after the push). The OS libraries
# Chromium needs are installed as ROOT (apt); the browser binary downloads as the
# deploy user — splitting them avoids `--with-deps` trying to sudo as the
# unprivileged deploy user (which has no sudo).
if "$VENV/bin/python" -c "import playwright" 2>/dev/null; then
  "$VENV/bin/python" -m playwright install-deps chromium
  sudo -u "$DEPLOY_USER" "$VENV/bin/python" -m playwright install chromium
else
  echo "  playwright not installed yet — push product code (deploy.sh) then re-run install.sh; skipping browser install"
fi

echo "==> [7/8] cloudflared (Cloudflare apt repo)"
if ! command -v cloudflared >/dev/null 2>&1; then
  mkdir -p /usr/share/keyrings
  curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg \
    -o /usr/share/keyrings/cloudflare-main.gpg
  echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared $(lsb_release -cs) main" \
    > /etc/apt/sources.list.d/cloudflared.list
  apt-get update -y
  apt-get install -y cloudflared
fi

echo "==> [8/8] install systemd units"
install -m 0644 "$SCRIPT_DIR"/systemd/12sq-*.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable 12sq-hailscan 12sq-hub 12sq-fieldcam 12sq-codesandmore 12sq-tunnel

cat <<'EOF'

==> install.sh complete.

NEXT STEPS (nothing is started yet — units are enabled but not running):
  1. Put shared secrets on the box:
       scp .env.local        deploy@<vps>:/home/deploy/12squared-ai/.env.local
       chmod 600 /home/deploy/12squared-ai/.env.local
  2. Put the Cloudflare tunnel token on the box:
       /home/deploy/.cloudflared/tunnel.env   (chmod 600)
       contents:  TUNNEL_TOKEN=<connector-token>
  3. Push the code (from your Mac):
       bash deploy/deploy.sh deploy@<vps>
  4. Start everything:
       sudo systemctl start 12sq-hailscan 12sq-hub 12sq-fieldcam 12sq-codesandmore 12sq-tunnel
  5. Verify (see README.md): curl the 4 local ports + the 4 public domains.
EOF
