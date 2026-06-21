#!/usr/bin/env bash
# 12² AI suite — push code from the Mac (or any source) to the VPS and restart.
# Re-runnable: use it for the first deploy AND every future update.
#
#   bash deploy.sh deploy@<vps-host>           # uses default Mac source paths
#   SRC_HAILSCAN=... SRC_SUITE=... bash deploy.sh deploy@<vps-host>
#
# What it does:
#   - rsync each product's code to the deploy user's home (mirrors the Mac layout)
#   - rsync the built Fieldcam SPA dist
#   - EXCLUDES venvs, .git, data/ caches, node_modules, *.pyc and other junk
#   - restarts the systemd units (needs passwordless sudo for systemctl, or run
#     the restart step manually — see the tail)
#
# It does NOT touch .env.local or the tunnel token (those are scp'd once, by hand).
set -euo pipefail

TARGET="${1:-}"
if [ -z "$TARGET" ]; then
  echo "usage: bash deploy.sh deploy@<vps-host>" >&2
  exit 1
fi

# Source paths default to the Mac layout; override via env for other machines.
SRC_HAILSCAN="${SRC_HAILSCAN:-$HOME/hailscan}"
SRC_SUITE="${SRC_SUITE:-$HOME/12squared-ai}"
SRC_FIELDCAM_DIST="${SRC_FIELDCAM_DIST:-$HOME/fieldcam-suite/dist}"

# Remote home (must match the systemd unit WorkingDirectory paths).
REMOTE_HOME=/home/deploy

# rsync excludes — never ship build/runtime cruft or the dev venvs/secrets.
EXCLUDES=(
  --exclude '.git/'
  --exclude '.venv/'
  --exclude 'suite-venv/'
  --exclude 'venv/'
  --exclude '__pycache__/'
  --exclude '*.pyc'
  --exclude '*.pyo'
  --exclude 'node_modules/'
  --exclude '.DS_Store'
  --exclude '*.log'
  # Runtime data/caches: regenerated on the box; never overwrite/ship local copies.
  --exclude 'data/videos/'
  --exclude 'data/videos_dramatization/'
  --exclude 'data/cache/'
  --exclude 'data/pdf/'
  --exclude '.env.local'
)

RSYNC=(rsync -az --delete --human-readable "${EXCLUDES[@]}")

echo "==> sync hailscan -> $TARGET:$REMOTE_HOME/hailscan/"
ssh "$TARGET" "mkdir -p $REMOTE_HOME/hailscan"
"${RSYNC[@]}" "$SRC_HAILSCAN"/ "$TARGET:$REMOTE_HOME/hailscan/"

echo "==> sync 12squared-ai (hub/fieldcam/codesandmore + scripts) -> $TARGET:$REMOTE_HOME/12squared-ai/"
ssh "$TARGET" "mkdir -p $REMOTE_HOME/12squared-ai"
# Sync hub, fieldcam, codesandmore, core, the landing site, and the deploy/ dir
# (keep .env.local and any on-box-only files via the --exclude above + the
# protect note in README). The hub serves landing/ at "/" (the 12squared.ai
# brand homepage); without it the hub falls back to redirecting "/" -> "/app".
"${RSYNC[@]}" \
  "$SRC_SUITE"/hub \
  "$SRC_SUITE"/fieldcam \
  "$SRC_SUITE"/codesandmore \
  "$SRC_SUITE"/core \
  "$SRC_SUITE"/landing \
  "$SRC_SUITE"/deploy \
  "$TARGET:$REMOTE_HOME/12squared-ai/"

echo "==> sync fieldcam SPA dist -> $TARGET:$REMOTE_HOME/fieldcam-suite/dist/"
ssh "$TARGET" "mkdir -p $REMOTE_HOME/fieldcam-suite/dist"
"${RSYNC[@]}" "$SRC_FIELDCAM_DIST"/ "$TARGET:$REMOTE_HOME/fieldcam-suite/dist/"

echo "==> restart systemd units"
# Needs the deploy user to have passwordless sudo for systemctl restart 12sq-*.
# If not configured, run this block manually on the box.
ssh "$TARGET" "sudo systemctl restart 12sq-hailscan 12sq-hub 12sq-fieldcam 12sq-codesandmore 12sq-tunnel" \
  || echo "WARN: remote restart failed — run 'sudo systemctl restart 12sq-*' on the box manually."

echo "==> deploy.sh complete. Verify the 4 local ports + 4 public domains (see README.md)."
