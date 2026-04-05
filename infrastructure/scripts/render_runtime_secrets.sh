#!/usr/bin/env bash
set -euo pipefail

if ! command -v aws >/dev/null 2>&1; then
  echo "aws CLI is required on the target host" >&2
  exit 1
fi

: "${AWS_REGION:?Set AWS_REGION}"
: "${COMPOSE_ENV_SECRET_NAME:?Set COMPOSE_ENV_SECRET_NAME}"
: "${BACKEND_CONFIG_SECRET_NAME:?Set BACKEND_CONFIG_SECRET_NAME}"

RUNTIME_DIR="${RUNTIME_DIR:-/opt/invisionu-ats/runtime}"
ENV_DIR="${RUNTIME_DIR}/env"
CONFIG_DIR="${RUNTIME_DIR}/config"

mkdir -p "${ENV_DIR}" "${CONFIG_DIR}"

aws secretsmanager get-secret-value \
  --region "${AWS_REGION}" \
  --secret-id "${COMPOSE_ENV_SECRET_NAME}" \
  --query 'SecretString' \
  --output text > "${ENV_DIR}/.env.prod"

aws secretsmanager get-secret-value \
  --region "${AWS_REGION}" \
  --secret-id "${BACKEND_CONFIG_SECRET_NAME}" \
  --query 'SecretString' \
  --output text > "${CONFIG_DIR}/config.prod.yaml"

chmod 600 "${ENV_DIR}/.env.prod" "${CONFIG_DIR}/config.prod.yaml"

echo "Rendered runtime files into ${RUNTIME_DIR}"
