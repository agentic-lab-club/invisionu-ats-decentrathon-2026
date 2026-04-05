# Backend E2E Tests

This directory contains the backend-led end-to-end verification flow for the `/applications` async pipeline.

Main entrypoint:

```bash
./backend/tests/e2e/application-full-pipeline-verification.sh --target local
```

or

```bash
./backend/tests/e2e/application-full-pipeline-verification.sh --target remote
```

## What it covers

- `GET /tests/personality/current`
- `POST /assets`
- `POST /applications`
- `GET /applications/status`
- async pipeline completion through:
  - STT
  - LLM scoring
  - AI Detect
  - parser

For `local`, the test also verifies database state in PostgreSQL.

## Targets

### `local`

- uses `http://127.0.0.1:8080` by default
- starts the required ATS services from the root `docker-compose.yml`
- creates a fresh verified user directly in Postgres
- generates a backend-compatible HS256 access token locally
- requires real S3 storage config to be present in `backend/config/config.prod.yaml`

### `remote`

- uses `https://d1fwa62fmryv66.cloudfront.net/api/backend` by default
- requires `REMOTE_ACCESS_TOKEN`
- does not inspect Docker or the database

## Required environment variables

Optional variables:

- `LOCAL_BASE_URL`
- `REMOTE_BASE_URL`
- `PROGRAM_CODE`
- `POLL_TIMEOUT_SECONDS`
- `POLL_INTERVAL_SECONDS`
- `LOCAL_CONFIG_PATH`
- `INTERVIEW_MEDIA_PATH`
- `IELTS_PDF_PATH`
- `ENT_PDF_PATH`

Required only for `remote`:

- `REMOTE_ACCESS_TOKEN`

## Fixtures

Default fixture paths:

- `backend/tests/e2e/fixtures/presentation-interview.mp4`
- `backend/tests/e2e/fixtures/ielts-document.pdf`
- `backend/tests/e2e/fixtures/ent-document.pdf`

The repository now includes a default spoken media fixture and parser-ready PDF fixtures. You can still override any path through `INTERVIEW_MEDIA_PATH`, `IELTS_PDF_PATH`, and `ENT_PDF_PATH`.

The media file should remain:

- ffmpeg-readable by the backend container
- short enough for repeated test runs
- actual spoken audio, otherwise STT will fail and the pipeline will stop before LLM scoring

## Artifacts

Every run stores request, response, and diagnostic files in:

```text
/tmp/tests-e2e-backend/<timestamp>/
```

On local failures the script also captures:

- recent container logs for `backend`, `sttwhisper`, `llmscoring`, `aidetect`, `parserapi`
- matching `applications`, `application_files`, and `scoring_runs` rows
