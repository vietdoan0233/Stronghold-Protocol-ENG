#!/usr/bin/env bash
# Stronghold Protocol: Alliance · macOS / Linux start script. Docs: docs/DEPLOY.md
#   scripts/start.sh [--port 3001] [--no-open] [--no-local] [--no-assets] …   (arguments go to scripts/launch.mjs)
# Checks Node.js ≥ 22, runs `npm ci` on the first run, then scripts/launch.mjs (tools/setup.mjs → server → browser).
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js not found (version 22 or later required; 22 / 24 LTS)."
  if [ "$(uname -s)" = "Darwin" ]; then
    echo "  Install with: brew install node@22   or   https://nodejs.org/en/download"
  else
    echo "  Install from https://nodejs.org/en/download or use your package manager, nvm, or fnm."
  fi
  exit 1
fi
if ! node -e "process.exit(Number(process.versions.node.split('.')[0])>=22?0:1)"; then
  echo "Node.js $(node -v) is too old. Version 22 or later is required (22 / 24 LTS): https://nodejs.org/en/download"
  exit 1
fi

if [ ! -f node_modules/ws/package.json ]; then
  echo "[First run] Installing dependencies with npm ci …"
  npm ci --no-audit --no-fund || npm install --no-audit --no-fund
fi

exec node scripts/launch.mjs "$@"
