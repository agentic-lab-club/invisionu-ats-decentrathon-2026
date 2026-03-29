# Healthcheck API Specification and Documentation

## Purpose and Scope

Owns public liveness, readiness, and health endpoints used by local development, orchestration probes, and service monitoring.

## Swagger Tag

- `@healthcheck`

## Owned Routes

- `GET /health`
- `GET /health/liveness`
- `GET /health/readiness`
- `GET /api/v1/healthcheck`
- `GET /api/v1/healthcheck/liveness`
- `GET /api/v1/healthcheck/readiness`

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
