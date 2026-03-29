# Golang Backend Agent Guide

Use this as the source of truth for agentic coding in `backend/`. It incorporates the intent of `ARCHITECTURE.md`.

## Quick Orientation

- Go: 1.25.x (`go.mod`), Fiber v3.
- Data: PostgreSQL via `sqlx`.
- Composition root: `cmd/server/main.go` wires modules, middleware, docs, metrics, and cross-module dependencies.
- Modules: feature packages under `internal/` with "modular monolith" boundaries.
- Shared infra: `pkg/` (config, db wrapper, http middlewares/responder, logger, metrics, integrations).
- Migrations: `db/migrations` (goose) run automatically at startup (`pkg/database/postgres.go`).
- Swagger: generated into `docs/` (pinned `swag` in Dockerfile) and served at `/docs/*`.

## Architecture Rules (What We Enforce)

- `cmd/server/main.go` is the only place that should "know about everything" and connect modules together.
- `internal/<module>` packages should not import other `internal/<other-module>` packages.
- Cross-module collaboration is done by passing dependencies at init time (service/hub handles returned from `Init(...)`), not by importing modules.
- Keep the layering intent: handlers are thin, services own business rules, repositories own data access. Splitting across multiple files is OK (and already used).

Pragmatic note: the repo contains both "preferred" patterns and older/one-off styles. When editing an existing module, preserve local conventions unless you are explicitly refactoring the module to the preferred patterns.

## HTTP Contracts (Fiber Locals, Middleware, Responses)

Middlewares in `pkg/http/middlewares` establish a locals contract that handlers should rely on instead of re-parsing:

- Correlation ID: request logger sets `correlation_id` and response header `X-Request-ID` (`pkg/logger/middleware.go`).
- Auth user ID: `md.AuthRole(...)` sets `auth_id` (uuid.UUID) on success.
- Params: `md.ValidateParam[T]("id")` stores parsed value in `Locals("id")`.
- Request body: `md.BindAndValidate[T]()` stores parsed struct in `Locals("body")`.
- Timeout context: `md.Timeout(...)` stores `context.Context` in `Locals("ctx")`.
- Logger: request logger stores a `*zerolog.Logger` in `Locals("log")`.
- Config (select routes): some routes inject config using `md.AddLocals("config", cfg)`; handlers may then read `conf := c.Locals("config").(*config.Config)` (example: `internal/payment/*`). If you add/extend endpoints in those areas, keep the contract consistent and include `md.AddLocals("config", cfg)` in `module.go`.

Responder helpers live in `pkg/http/responder` (import alias `respond`). Prefer:
- `respond.OK`, `respond.Created`, `respond.EmptyOK`, `respond.NoContent` for success.
- `respond.ErrorStatus` / `respond.WithStatus` for errors.

Important: `respond.Respond` only emits `{"error": ...}` when `err != nil`. Passing `nil` error with a string "error message" returns a JSON string, not an `{"error": ...}` object. New code should avoid that pattern for error responses.

## API + Middleware Baseline

`cmd/server/main.go` applies:
- `recover` with stack traces
- request logging + correlation IDs
- security headers + CSP overrides for `/docs`
- timeout + rate limit + CORS
- optional Prometheus metrics middleware + endpoint

When adding endpoints, assume these are always on and keep handlers fast (timeouts exist and are enforced).

Routing reality:
- Most HTTP endpoints live under `/api/v1/...` (modules typically `server.Group("/api/v1")`).
- Some endpoints are `/api/v2/...` (notably payments/courses).
- Auth OTP endpoints are at `/auth-otp/...`.
- Non-API endpoints: `/health`, `/docs/*`, and metrics at `cfg.Metrics.Path` (default `/metrics`).

## Data Access Standards (SQL, Squirrel, Metrics)

Hard rules:
- `SELECT *` is not allowed. Always list columns explicitly.
- Errors must be wrapped with action context: `fmt.Errorf("failed to <action>: %w", err)`.

Preferred DB execution (for metrics):
- Use `TrackedDB` methods when possible: `TrackedGet`, `TrackedSelect`, `TrackedExec("insert|update|delete", ...)`.
- If you use raw `db.Get/db.Select/db.Exec`, DB metrics will not be recorded (because tracking happens in `TrackedDB` wrappers).

SQL styles in this repo (all are allowed; pick one and be consistent within the touched area):

1. Embedded `.sql` files (common in `chat`, `booking`, `payment`, `class`, `catalogue`):
   - SQL lives under `internal/<module>/queries/*.sql`
   - Go embeds with `//go:embed queries/<name>.sql` (usually in `queries.go`)
   - Execution typically uses `db.Rebind(query)` and `Tracked*`
   - Placeholders can be `?` or `$n`; for Postgres, `db.Rebind` is safe either way (no-op if there are no `?`).

2. Squirrel builder (very common across modules):
   - Use `squirrel.StatementBuilder.PlaceholderFormat(squirrel.Dollar)` (or module-level `psql` builder)
   - Call `ToSql()`, then execute with `Tracked*` if possible.

3. Inline SQL strings (used for some complex/legacy repos):
   - Use `$n` placeholders for Postgres.
   - Prefer `Tracked*` for reads/writes to keep DB metrics.

Transactions:
- Use `Beginx()` (often exposed as `BeginTx()` helper) and pass `*sqlx.Tx` through repository methods when making multi-step changes.

## Migrations (Goose)

- Migrations live in `db/migrations/*.sql` and use goose directives (`-- +goose Up`, `-- +goose Down`, etc.).
- App startup runs `goose.Up` automatically (`pkg/database/postgres.go`), so broken migrations break boot.
- Prefer timestamped filenames (existing convention: `YYYYMMDDHHMMSS_description.sql`).

Template:

```sql
-- +goose Up
-- +goose StatementBegin

-- your SQL here

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

-- rollback SQL here

-- +goose StatementEnd
```

For changes that require schema updates, do the migration first, then update repositories/services.

## Swagger / Docs

- Swagger is generated from annotations in `cmd/server/main.go` and handler comments.
- Handlers should be documented with Swagger comments (`@Summary`, `@Description`, `@Tags`, `@Router`, etc.).
- Tag convention: the codebase mostly uses `// @Tags @<module>` (examples: `@auth`, `@booking`, `@class`, `@user`). Some older endpoints use mixed casing (e.g. `Payment`) or no `@`. New endpoints should follow `@Tags @<module>` consistently.
- Docker build pins and runs `swag init -g cmd/server/main.go` and produces environment-specific JSON (`docs/swagger-*.json`).
- Treat `docs/*` as generated artifacts. Update annotations and regenerate rather than hand-editing JSON/YAML.

Local regeneration (matching Docker pin) can be done with:
- `go run github.com/swaggo/swag/cmd/swag@v1.8.1 init -g cmd/server/main.go`

## Config

- Config is loaded via `pkg/config.Load()` using `-config=<env>` (default `local`).
- It reads `./config/config.<env>.yaml` via Viper and allows env overrides (dots become underscores).
- In practice, `config/config.local.yaml` acts like a checked-in `.env` equivalent for local development (but still keep secrets out of git and use real env vars when needed).
- If you add new config keys, update `config/config.example.yaml` and any relevant docs.

Environment checks (common pattern in services):

```go
env := strings.ToLower(strings.TrimSpace(s.config.Environment))
isProd := env == "prod" || env == "production"
```

## Time Rules

- Use `timekit.NowUTC()` for "now" and store/compare timestamps in UTC. `pkg/timekit` returns `time.Now().UTC()` and the server sets `time.Local = time.UTC` in `cmd/server/main.go`.
- If you need a user/region-specific offset, convert explicitly using a location (do not rely on local machine timezone).

## Logging Standards

- Always use the per-request logger from locals: `l := c.Locals("log").(*zerolog.Logger)`.
- Every meaningful log line should include an `event` field: `Str("event", "<domain>_<action>_<stage>")`.
- Common stages: `_start`, `_success`, `_failed`. Include `http_status` on failures when returning an error.
- Request logger redacts body content for sensitive endpoints by emitting `body_preview` as `<redacted>` (see `pkg/logger/middleware.go`). If you add new endpoints that accept secrets/PII/payment data, update `isSensitiveEndpoint()` accordingly.

## Agentic Workflow (Concrete Recipes)

For most feature work:
1. Start from `cmd/server/main.go` to see wiring and dependencies.
2. Open the module's `module.go` to see routes + middleware used.
3. Keep handlers thin: read locals, call service, return via `respond.*`.
4. Put business rules in service; keep repositories data-only.
5. Pick one SQL style for the touched area and keep it consistent.
6. Prefer `TrackedDB` methods to keep DB metrics working.
7. If you add a new endpoint, add/update tests in the same module (`*_test.go`). Prefer table-driven tests and keep them focused on handler/service behavior.
8. Run formatting + tests you touched: `gofmt` and Docker-based tests (see Docker Test Workflow below). Avoid local `go test` unless explicitly required.

New endpoint checklist:
- Add middleware in `module.go` (auth/param/body/config locals) instead of duplicating logic in handlers.
- Add Swagger docs in the handler (`@Summary`, `@Description`, `@Tags @<module>`, `@Router ...`).
- Add structured logs with `event` names and include `http_status` on failures.
- Add unit tests (`*_test.go`) in the same module for the new behavior.

## Docker Test Workflow

Preferred Docker-based test loop (fast, uses cached Go modules/builds):

```bash
make test-docker-build   # build test image (only when deps change)
make test-docker         # run all tests
```

Targeted tests without rebuilding:

```bash
docker compose run --rm --no-deps golang-test go test ./internal/payment
```

Long-lived test container is not recommended; prefer `docker compose run --rm --no-deps` for each test run.

## Module Template

Use `internal/_module_template/` as the canonical scaffold for new modules. Copy it to `internal/<module>/`, rename `*.tmpl` to real files, and adjust package/type/route/tag names.

Module README (required for every new module):
- Create `internal/<module>/README.md` when you add a module.
- It acts as Documentation and API Specification for module.
- Keep it short and structured: purpose/scope, owned routes, external deps (other services, queues, third-party APIs), config/env keys used, migrations added, and how to run module-specific tests. Link to relevant Swagger tags (`@<module>`).
- Update the README when adding significant behavior, new routes, or config flags.

Avoid:
- Importing other `internal/*` modules from a module.
- Expanding `cmd/server/main.go` business logic (it should only wire things).
- Introducing new one-off response shapes without a strong reason.
