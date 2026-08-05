#!/usr/bin/env bash
# Start the local-first desktop node stack (Docker Compose + desktop env flags).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
export ESTI_DESKTOP=true
export STORAGE_DRIVER="${STORAGE_DRIVER:-fs}"
export INSTALL_ID="${INSTALL_ID:-$(uuidgen 2>/dev/null || echo dev-desktop-1)}"
echo "Starting AORMS desktop node (INSTALL_ID=$INSTALL_ID)…"
docker compose up -d --build
echo "SPA → http://127.0.0.1:5173  API → http://127.0.0.1:4000"
