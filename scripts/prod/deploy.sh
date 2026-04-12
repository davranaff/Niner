#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT_DIR/docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env.prod}"

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Error: required command not found: $cmd" >&2
    exit 1
  fi
}

validate_port() {
  local name="$1"
  local value="$2"

  if ! [[ "$value" =~ ^[0-9]+$ ]]; then
    echo "Error: $name must be a number, got '$value'" >&2
    exit 1
  fi

  if (( value < 1 || value > 65535 )); then
    echo "Error: $name must be in range 1..65535, got '$value'" >&2
    exit 1
  fi
}

compose() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

require_cmd docker

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Error: compose file not found: $COMPOSE_FILE" >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: env file not found: $ENV_FILE" >&2
  echo "Create it first, for example:" >&2
  echo "  cp $ROOT_DIR/.env.prod.example $ROOT_DIR/.env.prod" >&2
  exit 1
fi

# shellcheck disable=SC1090
set -a
source "$ENV_FILE"
set +a

validate_port "API_PORT" "${API_PORT:-18000}"
validate_port "FRONTEND_PORT" "${FRONTEND_PORT:-30000}"
validate_port "LANDING_PORT" "${LANDING_PORT:-31000}"
validate_port "POSTGRES_PORT" "${POSTGRES_PORT:-54320}"
validate_port "REDIS_PORT" "${REDIS_PORT:-63790}"
validate_port "CADDY_HTTP_PORT" "${CADDY_HTTP_PORT:-800}"
validate_port "CADDY_HTTPS_PORT" "${CADDY_HTTPS_PORT:-443}"

compose config -q

echo "[deploy] Building production images..."
compose build --pull

echo "[deploy] Applying DB migrations..."
compose up -d postgres redis
max_attempts=10
attempt=1
until compose run --rm api alembic upgrade head; do
  if (( attempt >= max_attempts )); then
    echo "Error: migrations failed after $max_attempts attempts." >&2
    exit 1
  fi
  attempt=$((attempt + 1))
  echo "[deploy] API not ready yet, retrying migration in 4s... (attempt $attempt/$max_attempts)"
  sleep 4
done

echo "[deploy] Starting app services..."
compose up -d --remove-orphans api worker frontend landing caddy

echo "[deploy] Services status:"
compose ps

echo "[deploy] Done."
