#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB_PORT="${PGLITE_PORT:-55432}"
DB_HOST="${PGLITE_HOST:-127.0.0.1}"
DB_PATH="${PGLITE_DATA_DIR:-$ROOT_DIR/.pglite-data}"

export DATABASE_URL="postgresql://postgres:postgres@${DB_HOST}:${DB_PORT}/postgres"
export PG_POOL_MAX="${PG_POOL_MAX:-1}"
export NEXT_TELEMETRY_DISABLED="${NEXT_TELEMETRY_DISABLED:-1}"

cd "$ROOT_DIR"

node ./scripts/init-pglite-db.mjs

cleanup() {
  if [[ -n "${PGLITE_PID:-}" ]] && kill -0 "$PGLITE_PID" >/dev/null 2>&1; then
    kill "$PGLITE_PID" >/dev/null 2>&1 || true
    wait "$PGLITE_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

PGLITE_DATA_DIR="$DB_PATH" \
PGLITE_PORT="$DB_PORT" \
PGLITE_HOST="$DB_HOST" \
node ./scripts/start-pglite-socket.mjs \
  >/tmp/angle-pglite.log 2>&1 &

PGLITE_PID=$!

for _ in $(seq 1 60); do
  if ss -ltn | grep -q ":${DB_PORT} "; then
    break
  fi
  sleep 1
done

if ! ss -ltn | grep -q ":${DB_PORT} "; then
  echo "PGlite server failed to start"
  cat /tmp/angle-pglite.log || true
  exit 1
fi

npm run build
exec npm run start
