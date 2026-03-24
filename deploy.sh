#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD=(docker-compose)
else
  echo "docker compose 或 docker-compose 不可用"
  exit 1
fi

cd "$ROOT_DIR"

git pull --ff-only
"${COMPOSE_CMD[@]}" down
"${COMPOSE_CMD[@]}" up -d --build
"${COMPOSE_CMD[@]}" ps
