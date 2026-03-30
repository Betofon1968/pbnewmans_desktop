#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-5173}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Starting local debug server for: $ROOT_DIR"
echo "URL: http://127.0.0.1:${PORT}/index.html"
echo "Press Ctrl+C to stop."

cd "$ROOT_DIR"

if command -v node >/dev/null 2>&1; then
  node ./scripts/prepare-assets.mjs
  exec node ./scripts/start-local-server.mjs "$PORT"
fi

if command -v python3 >/dev/null 2>&1; then
  exec python3 -m http.server "$PORT" --bind 127.0.0.1
fi

echo "Error: neither node nor python3 is available on PATH." >&2
exit 1
