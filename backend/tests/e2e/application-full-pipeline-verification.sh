#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
REPO_ROOT="$(cd "${BACKEND_DIR}/.." && pwd)"
HELPER="${SCRIPT_DIR}/jwt_and_json_helper.py"
FIXTURES_DIR="${SCRIPT_DIR}/fixtures"

TARGET="local"
LOCAL_BASE_URL="${LOCAL_BASE_URL:-http://127.0.0.1:8080}"
REMOTE_BASE_URL="${REMOTE_BASE_URL:-https://d1fwa62fmryv66.cloudfront.net/api/backend}"
PROGRAM_CODE="${PROGRAM_CODE:-undergrad_tech}"
POLL_TIMEOUT_SECONDS="${POLL_TIMEOUT_SECONDS:-300}"
POLL_INTERVAL_SECONDS="${POLL_INTERVAL_SECONDS:-5}"
LOCAL_CONFIG_PATH="${LOCAL_CONFIG_PATH:-${BACKEND_DIR}/config/config.prod.yaml}"
INTERVIEW_MEDIA_PATH="${INTERVIEW_MEDIA_PATH:-${FIXTURES_DIR}/presentation-interview.mp4}"
IELTS_PDF_PATH="${IELTS_PDF_PATH:-${FIXTURES_DIR}/ielts-document.pdf}"
ENT_PDF_PATH="${ENT_PDF_PATH:-${FIXTURES_DIR}/ent-document.pdf}"

RUN_TIMESTAMP="$(date -u +"%Y%m%dT%H%M%SZ")"
ARTIFACT_ROOT="/tmp/tests-e2e-backend/${RUN_TIMESTAMP}"
mkdir -p "${ARTIFACT_ROOT}"

APPLICATION_ID=""
ACCESS_TOKEN=""
LOCAL_USER_ID=""
LOCAL_USER_EMAIL=""
BASE_URL=""
STATUS_FILE=""

log() {
  printf '[e2e] %s\n' "$*"
}

die() {
  printf '[e2e][error] %s\n' "$*" >&2
  exit 1
}

save_text() {
  local path="$1"
  shift
  printf '%s\n' "$*" > "${path}"
}

compose() {
  docker compose -f "${REPO_ROOT}/docker-compose.yml" "$@"
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "required command not found: $1"
}

json_get() {
  local file="$1"
  local path="$2"
  python3 "${HELPER}" json-get "${file}" "${path}"
}

json_require_keys() {
  local file="$1"
  shift
  python3 "${HELPER}" json-require-keys "${file}" "$@"
}

json_build_personality_answers() {
  local file="$1"
  python3 "${HELPER}" build-personality-answers "${file}"
}

generate_jwt() {
  local secret="$1"
  local user_id="$2"
  local ttl_seconds="$3"
  python3 "${HELPER}" jwt "${secret}" "${user_id}" "${ttl_seconds}"
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --target)
        [[ $# -ge 2 ]] || die "--target requires a value"
        TARGET="$2"
        shift 2
        ;;
      --help|-h)
        cat <<'EOF'
Usage:
  ./backend/tests/e2e/application-full-pipeline-verification.sh --target local
  ./backend/tests/e2e/application-full-pipeline-verification.sh --target remote
EOF
        exit 0
        ;;
      *)
        die "unknown argument: $1"
        ;;
    esac
  done
}

cleanup_on_failure() {
  local exit_code=$?
  if [[ "${exit_code}" -eq 0 ]]; then
    return
  fi

  log "capturing failure diagnostics into ${ARTIFACT_ROOT}"

  if [[ -n "${STATUS_FILE}" && -f "${STATUS_FILE}" ]]; then
    cp "${STATUS_FILE}" "${ARTIFACT_ROOT}/latest-status.json" || true
  fi

  if [[ "${TARGET}" == "local" ]]; then
    dump_local_diagnostics || true
  fi
}

trap cleanup_on_failure EXIT

assert_file_exists() {
  local path="$1"
  [[ -f "${path}" ]] || die "required fixture or file is missing: ${path}"
}

wait_for_http_ok() {
  local name="$1"
  local url="$2"
  local timeout_seconds="$3"
  local started_at
  started_at="$(date +%s)"

  while true; do
    if curl -fsS "${url}" >/dev/null 2>&1; then
      log "${name} is healthy"
      return 0
    fi

    if (( "$(date +%s)" - started_at >= timeout_seconds )); then
      die "${name} did not become healthy within ${timeout_seconds}s: ${url}"
    fi

    sleep 3
  done
}

store_response() {
  local name="$1"
  local body_path="$2"
  local code="$3"
  cp "${body_path}" "${ARTIFACT_ROOT}/${name}.json"
  save_text "${ARTIFACT_ROOT}/${name}.http_code" "${code}"
}

curl_json() {
  local name="$1"
  local method="$2"
  local url="$3"
  local body_path="${ARTIFACT_ROOT}/${name}.tmp.body"
  shift 3

  local code
  code="$(curl -sS -o "${body_path}" -w "%{http_code}" -X "${method}" "$@" "${url}")"
  store_response "${name}" "${body_path}" "${code}"
  printf '%s' "${code}"
}

curl_upload() {
  local name="$1"
  local url="$2"
  local body_path="${ARTIFACT_ROOT}/${name}.tmp.body"
  shift 2

  local code
  code="$(curl -sS -o "${body_path}" -w "%{http_code}" -X POST "$@" "${url}")"
  store_response "${name}" "${body_path}" "${code}"
  printf '%s' "${code}"
}

assert_http_code() {
  local actual="$1"
  local expected="$2"
  local label="$3"
  [[ "${actual}" == "${expected}" ]] || die "${label} returned HTTP ${actual}, expected ${expected}"
}

read_config_value() {
  local key="$1"
  local value
  value="$(sed -n "s/^  ${key}: \"\\(.*\\)\"/\\1/p" "${LOCAL_CONFIG_PATH}" | head -n 1)"
  [[ -n "${value}" ]] || die "could not read '${key}' from ${LOCAL_CONFIG_PATH}"
  printf '%s' "${value}"
}

assert_local_storage_config() {
  assert_file_exists "${LOCAL_CONFIG_PATH}"

  local provider bucket region access_key secret_key
  provider="$(read_config_value "provider")"
  bucket="$(read_config_value "bucket")"
  region="$(read_config_value "region")"
  access_key="$(read_config_value "access_key")"
  secret_key="$(read_config_value "secret_key")"

  [[ "${provider}" == "s3" ]] || die "local storage provider must be s3, got: ${provider}"
  [[ -n "${bucket}" ]] || die "storage.bucket is empty"
  [[ -n "${region}" ]] || die "storage.region is empty"
  [[ -n "${access_key}" ]] || die "storage.access_key is empty"
  [[ -n "${secret_key}" ]] || die "storage.secret_key is empty"

  log "local storage preflight passed for bucket ${bucket} in ${region}"
}

ensure_fixtures() {
  assert_file_exists "${IELTS_PDF_PATH}"
  assert_file_exists "${ENT_PDF_PATH}"
  assert_file_exists "${INTERVIEW_MEDIA_PATH}"
}

start_local_stack() {
  log "starting required ATS services"
  compose up -d --build postgres backend llmscoring sttwhisper aidetect parserapi

  wait_for_http_ok "backend" "${LOCAL_BASE_URL}/health" 240
  wait_for_http_ok "llmscoring" "http://127.0.0.1:9094/docs" 240
  wait_for_http_ok "sttwhisper" "http://127.0.0.1:9095/docs" 240
  wait_for_http_ok "aidetect" "http://127.0.0.1:9873/health" 240
  wait_for_http_ok "parserapi" "http://127.0.0.1:8002/health" 240
}

db_query() {
  local sql="$1"
  compose exec -T postgres sh -lc "psql -U \"\$DB_USER\" -d \"\$DB_DATABASE\" -At -F '|' -c \"$sql\""
}

create_local_verified_user() {
  LOCAL_USER_ID="$(python3 - <<'PY'
import uuid
print(uuid.uuid4())
PY
)"
  LOCAL_USER_EMAIL="e2e.application.pipeline.${RUN_TIMESTAMP}@invisionu.local"
  local password_hash
  password_hash='$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'

  local insert_sql
  insert_sql="INSERT INTO users (id, email, password_hash, role, is_email_verified, created_at, updated_at)
VALUES ('${LOCAL_USER_ID}', '${LOCAL_USER_EMAIL}', '${password_hash}', 'user', TRUE, NOW(), NOW());"
  db_query "${insert_sql}" >/dev/null

  log "created local verified user ${LOCAL_USER_EMAIL}"
}

prepare_local_token() {
  local secret ttl
  secret="$(sed -n 's/^  jwt_access_secret: "\(.*\)"/\1/p' "${LOCAL_CONFIG_PATH}" | head -n 1)"
  ttl="$(sed -n 's/^  access_token_ttl_seconds: \([0-9][0-9]*\)/\1/p' "${LOCAL_CONFIG_PATH}" | head -n 1)"
  [[ -n "${secret}" ]] || die "jwt_access_secret is empty in ${LOCAL_CONFIG_PATH}"
  [[ -n "${ttl}" ]] || ttl="3600"

  ACCESS_TOKEN="$(generate_jwt "${secret}" "${LOCAL_USER_ID}" "${ttl}")"
}

prepare_remote_token() {
  ACCESS_TOKEN="${REMOTE_ACCESS_TOKEN:-}"
  [[ -n "${ACCESS_TOKEN}" ]] || die "REMOTE_ACCESS_TOKEN is required for remote target"
}

preflight_remote() {
  wait_for_http_ok "remote docs" "https://d1fwa62fmryv66.cloudfront.net/api/backend/docs" 60
  wait_for_http_ok "remote backend" "${REMOTE_BASE_URL}/docs" 60
}

fetch_personality_test() {
  local code
  code="$(curl_json "01-personality-test" GET "${BASE_URL}/tests/personality/current" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Accept: application/json")"
  assert_http_code "${code}" "200" "GET /tests/personality/current"
  json_require_keys "${ARTIFACT_ROOT}/01-personality-test.json" test_id code title questions
}

upload_asset() {
  local name="$1"
  local file_type="$2"
  local path="$3"
  local mime="$4"
  local code

  code="$(curl_upload "${name}" "${BASE_URL}/assets" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Accept: application/json" \
    -F "file_type=${file_type}" \
    -F "file=@${path};type=${mime}")"
  assert_http_code "${code}" "201" "POST /assets (${file_type})"
  json_require_keys "${ARTIFACT_ROOT}/${name}.json" file_id file_type original_filename
  json_get "${ARTIFACT_ROOT}/${name}.json" file_id
}

guess_media_mime() {
  local path="$1"
  case "${path##*.}" in
    mp4|MP4)
      printf '%s' "video/mp4"
      ;;
    mov|MOV)
      printf '%s' "video/quicktime"
      ;;
    m4a|M4A)
      printf '%s' "audio/mp4"
      ;;
    mp3|MP3)
      printf '%s' "audio/mpeg"
      ;;
    wav|WAV)
      printf '%s' "audio/wav"
      ;;
    *)
      printf '%s' "application/octet-stream"
      ;;
  esac
}

submit_application() {
  local personality_file="${ARTIFACT_ROOT}/01-personality-test.json"
  local answers_file="${ARTIFACT_ROOT}/02-personality-answers.json"
  local payload_file="${ARTIFACT_ROOT}/03-application-request.json"
  local code
  local video_file_id english_file_id certificate_file_id

  printf '%s\n' "$(json_build_personality_answers "${personality_file}")" > "${answers_file}"

  video_file_id="$(json_get "${ARTIFACT_ROOT}/02-upload-video.json" file_id)"
  english_file_id="$(json_get "${ARTIFACT_ROOT}/03-upload-ielts.json" file_id)"
  certificate_file_id="$(json_get "${ARTIFACT_ROOT}/04-upload-ent.json" file_id)"

  python3 - <<PY > "${payload_file}"
import json
from pathlib import Path

answers = json.loads(Path("${answers_file}").read_text())
payload = {
    "first_name": "E2E",
    "last_name": "Pipeline",
    "phone_number": "+77001009999",
    "program_code": "${PROGRAM_CODE}",
    "video_file_id": "${video_file_id}",
    "english_result_file_id": "${english_file_id}",
    "certificate_file_id": "${certificate_file_id}",
    "personality_test_answers": answers,
}
print(json.dumps(payload))
PY

  code="$(curl_json "05-submit-application" POST "${BASE_URL}/applications/" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    --data-binary "@${payload_file}")"
  assert_http_code "${code}" "201" "POST /applications"
  json_require_keys "${ARTIFACT_ROOT}/05-submit-application.json" application_id
  APPLICATION_ID="$(json_get "${ARTIFACT_ROOT}/05-submit-application.json" application_id)"
}

poll_application_status() {
  local deadline
  local attempt=1
  deadline=$(( $(date +%s) + POLL_TIMEOUT_SECONDS ))
  STATUS_FILE="${ARTIFACT_ROOT}/06-application-status.json"

  while (( $(date +%s) <= deadline )); do
    local body_path="${ARTIFACT_ROOT}/06-application-status-attempt-${attempt}.tmp.body"
    local code
    code="$(curl -sS -o "${body_path}" -w "%{http_code}" \
      -H "Authorization: Bearer ${ACCESS_TOKEN}" \
      -H "Accept: application/json" \
      "${BASE_URL}/applications/status")"
    cp "${body_path}" "${ARTIFACT_ROOT}/06-application-status-attempt-${attempt}.json"

    if [[ "${code}" == "200" ]]; then
      cp "${body_path}" "${STATUS_FILE}"
      json_require_keys "${STATUS_FILE}" application_id review_stage decision screening_status screening_error

      local returned_application_id screening_status
      returned_application_id="$(json_get "${STATUS_FILE}" application_id)"
      screening_status="$(json_get "${STATUS_FILE}" screening_status)"

      [[ "${returned_application_id}" == "${APPLICATION_ID}" ]] || die "status endpoint returned unexpected application_id ${returned_application_id}, expected ${APPLICATION_ID}"

      if [[ "${screening_status}" == "completed" ]]; then
        log "application screening completed"
        return 0
      fi
      if [[ "${screening_status}" == "failed" ]]; then
        die "application screening failed"
      fi
    elif [[ "${code}" != "404" ]]; then
      cp "${body_path}" "${STATUS_FILE}"
      die "GET /applications/status returned unexpected HTTP ${code}"
    fi

    attempt=$((attempt + 1))
    sleep "${POLL_INTERVAL_SECONDS}"
  done

  die "application screening did not complete within ${POLL_TIMEOUT_SECONDS}s"
}

assert_sql_equals() {
  local label="$1"
  local sql="$2"
  local expected="$3"
  local actual
  actual="$(db_query "${sql}")"
  [[ "${actual}" == "${expected}" ]] || die "${label}: expected '${expected}', got '${actual}'"
}

assert_sql_non_empty() {
  local label="$1"
  local sql="$2"
  local actual
  actual="$(db_query "${sql}")"
  [[ -n "${actual}" ]] || die "${label}: query returned empty result"
}

assert_local_db_state() {
  assert_sql_equals "applications.ai_probability column" \
    "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'applications' AND column_name = 'ai_probability';" \
    "1"
  assert_sql_equals "applications.ielts_score column" \
    "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'applications' AND column_name = 'ielts_score';" \
    "1"
  assert_sql_equals "applications.ent_score column" \
    "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'applications' AND column_name = 'ent_score';" \
    "1"
  assert_sql_equals "scoring_runs table" \
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'scoring_runs';" \
    "1"
  assert_sql_equals "application_files table" \
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'application_files';" \
    "1"

  assert_sql_equals "applications row count" \
    "SELECT COUNT(*) FROM applications WHERE id = '${APPLICATION_ID}';" \
    "1"
  assert_sql_equals "screening_status" \
    "SELECT screening_status FROM applications WHERE id = '${APPLICATION_ID}';" \
    "completed"
  assert_sql_equals "screening_error is null" \
    "SELECT CASE WHEN screening_error IS NULL THEN 'null' ELSE 'not-null' END FROM applications WHERE id = '${APPLICATION_ID}';" \
    "null"

  assert_sql_non_empty "video_transcript" \
    "SELECT video_transcript FROM applications WHERE id = '${APPLICATION_ID}' AND video_transcript IS NOT NULL;"
  assert_sql_non_empty "ai_probability" \
    "SELECT ai_probability::text FROM applications WHERE id = '${APPLICATION_ID}' AND ai_probability IS NOT NULL;"
  assert_sql_non_empty "ielts_score" \
    "SELECT ielts_score::text FROM applications WHERE id = '${APPLICATION_ID}' AND ielts_score IS NOT NULL;"
  assert_sql_non_empty "ent_score" \
    "SELECT ent_score::text FROM applications WHERE id = '${APPLICATION_ID}' AND ent_score IS NOT NULL;"

  assert_sql_equals "video_presentation file row" \
    "SELECT COUNT(*) FROM application_files WHERE application_id = '${APPLICATION_ID}' AND file_type = 'video_presentation';" \
    "1"
  assert_sql_equals "english_result file row" \
    "SELECT COUNT(*) FROM application_files WHERE application_id = '${APPLICATION_ID}' AND file_type = 'english_result';" \
    "1"
  assert_sql_equals "certificate file row" \
    "SELECT COUNT(*) FROM application_files WHERE application_id = '${APPLICATION_ID}' AND file_type = 'certificate';" \
    "1"
  assert_sql_equals "video_audio file row" \
    "SELECT COUNT(*) FROM application_files WHERE application_id = '${APPLICATION_ID}' AND file_type = 'video_audio';" \
    "1"

  assert_sql_equals "personality_test scoring run" \
    "SELECT COUNT(*) FROM scoring_runs WHERE application_id = '${APPLICATION_ID}' AND model_name = 'personality_test';" \
    "1"
  assert_sql_equals "llmscoring scoring run" \
    "SELECT COUNT(*) FROM scoring_runs WHERE application_id = '${APPLICATION_ID}' AND model_name = 'llmscoring';" \
    "1"
  assert_sql_equals "aidetect scoring run" \
    "SELECT COUNT(*) FROM scoring_runs WHERE application_id = '${APPLICATION_ID}' AND model_name = 'aidetect';" \
    "1"
  assert_sql_equals "parser_ielts scoring run" \
    "SELECT COUNT(*) FROM scoring_runs WHERE application_id = '${APPLICATION_ID}' AND model_name = 'parser_ielts';" \
    "1"
  assert_sql_equals "parser_ent scoring run" \
    "SELECT COUNT(*) FROM scoring_runs WHERE application_id = '${APPLICATION_ID}' AND model_name = 'parser_ent';" \
    "1"
}

dump_local_diagnostics() {
  if ! command -v docker >/dev/null 2>&1; then
    return
  fi

  if [[ -n "${APPLICATION_ID}" ]]; then
    db_query "SELECT id, user_id, review_stage, decision, screening_status, screening_error, ai_probability, ielts_score, ent_score FROM applications WHERE id = '${APPLICATION_ID}';" > "${ARTIFACT_ROOT}/db-application.txt" || true
    db_query "SELECT id, file_type, original_filename, object_key FROM application_files WHERE application_id = '${APPLICATION_ID}' ORDER BY created_at;" > "${ARTIFACT_ROOT}/db-application-files.txt" || true
    db_query "SELECT id, model_name, created_at FROM scoring_runs WHERE application_id = '${APPLICATION_ID}' ORDER BY created_at;" > "${ARTIFACT_ROOT}/db-scoring-runs.txt" || true
  fi

  compose logs --tail=200 backend > "${ARTIFACT_ROOT}/backend.log" || true
  compose logs --tail=200 sttwhisper > "${ARTIFACT_ROOT}/sttwhisper.log" || true
  compose logs --tail=200 llmscoring > "${ARTIFACT_ROOT}/llmscoring.log" || true
  compose logs --tail=200 aidetect > "${ARTIFACT_ROOT}/aidetect.log" || true
  compose logs --tail=200 parserapi > "${ARTIFACT_ROOT}/parserapi.log" || true
}

run_flow() {
  fetch_personality_test

  save_text "${ARTIFACT_ROOT}/fixture-paths.txt" \
    "interview_media=${INTERVIEW_MEDIA_PATH}" \
    "ielts_pdf=${IELTS_PDF_PATH}" \
    "ent_pdf=${ENT_PDF_PATH}"

  upload_asset "02-upload-video" "video_presentation" "${INTERVIEW_MEDIA_PATH}" "$(guess_media_mime "${INTERVIEW_MEDIA_PATH}")" >/dev/null
  upload_asset "03-upload-ielts" "english_result" "${IELTS_PDF_PATH}" "application/pdf" >/dev/null
  upload_asset "04-upload-ent" "certificate" "${ENT_PDF_PATH}" "application/pdf" >/dev/null

  submit_application
  poll_application_status
}

main() {
  parse_args "$@"

  require_cmd bash
  require_cmd curl
  require_cmd python3
  assert_file_exists "${HELPER}"

  case "${TARGET}" in
    local)
      BASE_URL="${LOCAL_BASE_URL}"
      require_cmd docker
      ensure_fixtures
      assert_local_storage_config
      start_local_stack
      create_local_verified_user
      prepare_local_token
      run_flow
      assert_local_db_state
      ;;
    remote)
      BASE_URL="${REMOTE_BASE_URL}"
      ensure_fixtures
      prepare_remote_token
      preflight_remote
      run_flow
      ;;
    *)
      die "unsupported target: ${TARGET}"
      ;;
  esac

  log "application full pipeline verification passed"
  log "artifacts saved in ${ARTIFACT_ROOT}"
}

main "$@"
