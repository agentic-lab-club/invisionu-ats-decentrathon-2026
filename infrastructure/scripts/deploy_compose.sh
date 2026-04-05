#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
RUNTIME_DIR="${RUNTIME_DIR:-/opt/invisionu-ats/runtime}"
COMPOSE_FILE="${COMPOSE_FILE:-${REPO_ROOT}/docker-compose.prod.yml}"

: "${AWS_REGION:?Set AWS_REGION}"
: "${COMPOSE_ENV_SECRET_NAME:?Set COMPOSE_ENV_SECRET_NAME}"
: "${BACKEND_CONFIG_SECRET_NAME:?Set BACKEND_CONFIG_SECRET_NAME}"

"${SCRIPT_DIR}/render_runtime_secrets.sh"

docker compose \
  --env-file "${RUNTIME_DIR}/env/.env.prod" \
  -f "${COMPOSE_FILE}" \
  up -d --build

docker compose -f "${COMPOSE_FILE}" ps
