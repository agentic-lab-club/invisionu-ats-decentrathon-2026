# Healthcheck API Specification and Documentation

## Purpose and Scope

Owns public liveness, readiness, and health endpoints for local development, Docker probes, and service monitoring.

## Business Rules

- `/health` performs composite checks and returns structured status.
- `/health/readiness` requires a working database ping.
- `/health/liveness` is process-only and does not require database access.
- Legacy aliases under `/api/v1/healthcheck` are kept for compatibility with older checks and tests.

## Swagger Tag

- `@healthcheck`

## Owned Routes

- `GET /health`
- `GET /health/liveness`
- `GET /health/readiness`
- `GET /api/v1/healthcheck`
- `GET /api/v1/healthcheck/`
- `GET /api/v1/healthcheck/liveness`
- `GET /api/v1/healthcheck/readiness`

## Auth Requirements

- None

## Request and Response Examples

`GET /health`

- success:
  `{"status":"healthy","checks":{"database_ping":{"status":"healthy"}}}`

`GET /health/readiness`

- success:
  `{"status":"ready"}`

## Error Cases

- `503`: readiness failure because database is unavailable

## External Dependencies

- PostgreSQL connectivity through `pkg/database`

## Config and Env Keys Used

- `database.*`

## Migrations Added

- none

## Module Tests

```bash
go test ./internal/healthcheck
```
