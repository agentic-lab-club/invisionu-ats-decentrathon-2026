# Healthcheck Module Contract

## Purpose

Own public health, liveness, and readiness endpoints for infrastructure, Docker probes, and operational monitoring.

## Responsibilities

- Expose composite health status with dependency checks.
- Expose lightweight liveness probe.
- Expose readiness probe backed by database reachability.
- Preserve legacy aliases under `/api/v1/healthcheck`.

## Out Of Scope

- Authentication or authorization.
- Business feature checks.
- Deep dependency probing beyond the database.
- Metrics export.

## Domain Concepts / Entities

### Overall statuses

- `healthy`
- `degraded`
- `unhealthy`

### Check result

Each named check has:
- `status`
- `message`
- `latency`

### Probe responses

- liveness: `{"status":"alive"}`
- readiness: `{"status":"ready"}`

## Endpoint Overview

- `GET /health`
- `GET /health/liveness`
- `GET /health/readiness`
- `GET /api/v1/healthcheck`
- `GET /api/v1/healthcheck/`
- `GET /api/v1/healthcheck/liveness`
- `GET /api/v1/healthcheck/readiness`

Example `GET /health` response:

```json
{
  "status": "healthy",
  "timestamp": "2026-03-31T00:00:00Z",
  "checks": {
    "database_ping": {
      "status": "healthy",
      "message": "Database is reachable",
      "latency": "1ms"
    },
    "database_query": {
      "status": "healthy",
      "message": "Database queries working",
      "latency": "2ms"
    }
  }
}
```

## Auth / Roles

- No auth required.

## Request / Response Conventions

- All routes are `GET`.
- No request body.
- `/health` returns a structured JSON document.
- `/health/liveness` and `/health/readiness` return small JSON responses.
- Error body shape on readiness failure uses shared responder helpers.

## Business Flows

### Composite health flow

1. Ping database.
2. Run `SELECT 1`.
3. Mark overall status:
   - `unhealthy` if any DB check fails
   - `degraded` if query succeeds but latency exceeds `100ms`
   - `healthy` otherwise

### Liveness flow

1. Return `{"status":"alive"}` without touching the database.

### Readiness flow

1. Ping database.
2. Return `{"status":"ready"}` on success.
3. Return `503` if database ping fails.

## Validation Rules

- No request validation is needed; endpoints accept no parameters.

## Lifecycle / State Transitions

Observed health lifecycle:
- `healthy` -> `degraded` when DB query is slow
- `healthy|degraded` -> `unhealthy` when DB checks fail
- readiness toggles between `ready` and not ready based on DB ping
- liveness is always `alive` while the process is serving

## Error Handling

- `GET /health`
  - `200` for `healthy` or `degraded`
  - `503` for `unhealthy`
  - `500` only if the health service itself returns an unexpected error
- `GET /health/readiness`
  - `200` when database ping succeeds
  - `503` when database ping fails
- `GET /health/liveness`
  - `200` unless Fiber/middleware fails before handler

## Security Notes

- Endpoints are intentionally public.
- Response includes infrastructure state and DB latency, so avoid exposing them on fully public internet without network controls.

## Frontend Integration Notes

- Frontend generally should not depend on these routes.
- Use them for environment diagnostics or admin tooling only.
- Legacy `/api/v1/healthcheck*` aliases exist for compatibility; prefer `/health*` for new integrations.

## Known Limitations / TODO

- Only database health is checked.
- No downstream checks for object storage, email, or messaging.
- `GetDatabaseStats` exists in service/repository but is not exposed as an HTTP endpoint.

## Related Files / Modules

- `internal/healthcheck/module.go`
- `internal/healthcheck/handler.go`
- `internal/healthcheck/service.go`
- `internal/healthcheck/repository.go`
- `internal/healthcheck/domain.go`
- `pkg/database`
