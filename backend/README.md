# Backend Template

Reusable Go backend template with:

- `Fiber v3` HTTP server
- `PostgreSQL` + auto migrations via `goose`
- `/health` and `/api/v1/healthcheck/*` endpoints
- Prometheus metrics support
- Swagger generation support
- Docker Compose for local development

## Quick Start

1. Copy `.env.example` to `.env`
2. Update `config/config.local.yaml` if needed
3. Run:

```bash
docker compose up --build
```

API defaults:

- App: `http://localhost:8080`
- Health: `http://localhost:8080/health`
- Readiness: `http://localhost:8080/health/readiness`
- Liveness: `http://localhost:8080/health/liveness`
- Metrics: `http://localhost:8080/metrics`

## Swagger

Generate Swagger locally:

```bash
make swagger
```

Then open:

```text
http://localhost:8080/docs
```

## Template Usage

- Add new feature modules under `internal/<module>`
- Wire modules only from `cmd/server/main.go`
- Keep shared infrastructure in `pkg/`
- Add schema changes in `db/migrations`
