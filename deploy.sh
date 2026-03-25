#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$ROOT_DIR/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo ".env 不存在，请先从模板复制：cp .env.production .env"
  exit 1
fi

# shellcheck disable=SC1090
set -a
source "$ENV_FILE"
set +a

required_vars=(
  AUTH_SECRET
  DATABASE_URL
  POSTGRES_DB
  POSTGRES_USER
  POSTGRES_PASSWORD
)

missing_vars=()

for var_name in "${required_vars[@]}"; do
  if [[ -z "${!var_name:-}" ]]; then
    missing_vars+=("$var_name")
  fi
done

if (( ${#missing_vars[@]} > 0 )); then
  echo ".env 缺少关键变量：${missing_vars[*]}"
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD=(docker-compose)
else
  COMPOSE_CMD=(
    docker run --rm
    -v /var/run/docker.sock:/var/run/docker.sock
    -v "$ROOT_DIR:$ROOT_DIR"
    -w "$ROOT_DIR"
    m.daocloud.io/docker.io/docker/compose:1.29.2
  )
fi

cd "$ROOT_DIR"

echo "Using env file: $ENV_FILE"
echo "Using compose command: ${COMPOSE_CMD[*]}"

git pull --ff-only
"${COMPOSE_CMD[@]}" --env-file "$ENV_FILE" down
"${COMPOSE_CMD[@]}" --env-file "$ENV_FILE" up -d --build
"${COMPOSE_CMD[@]}" --env-file "$ENV_FILE" ps
