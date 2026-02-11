#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-5173}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Starting local debug server for: $ROOT_DIR"
echo "URL: http://127.0.0.1:${PORT}/index.html"
echo "Press Ctrl+C to stop."

cd "$ROOT_DIR"

if command -v python3 >/dev/null 2>&1; then
  exec python3 -m http.server "$PORT" --bind 127.0.0.1
fi

if command -v node >/dev/null 2>&1; then
  exec npx --yes http-server -p "$PORT" -a 127.0.0.1 .
fi

echo "Error: neither python3 nor node is available on PATH." >&2
exit 1
