# Module Template (Copy-Paste Scaffold)

This folder contains `.tmpl` files that serve as a scaffold for new `internal/<module>/` modules.
They are not compiled by Go because they are not `*.go`.

## How To Use

1. Copy this folder to `internal/<module_name>/` (choose a real module name, lowercase, no dashes).
2. Rename `*.go.tmpl` to `*.go` and update:
   - `package <module_name>`
   - types / DTOs / route paths
   - Swagger tags: `@Tags @<module_name>`
3. If you use embedded SQL:
   - move `queries/*.sql.tmpl` to `queries/*.sql`
   - update `queries.go` embed directives and variable names
4. Register the module from `cmd/server/main.go` by calling `<module>.Init(server, trackedDB, cfg, ...)` if needed.
5. Add `*_test.go` tests in the same module for new endpoints.

## Standards This Template Assumes

- Fiber handlers rely on middleware locals:
  - `auth_id` (`uuid.UUID`) set by `md.AuthRole`
  - `body` (parsed DTO) set by `md.BindAndValidate[T]()`
  - `log` (`*zerolog.Logger`) set by request logger middleware
  - `ctx` (`context.Context`) set by timeout middleware
- Prefer `respond.*` helpers for responses.
- Prefer `TrackedDB` methods (`TrackedGet/TrackedSelect/TrackedExec`) for DB metrics.
- Keep modules isolated: do not import other `internal/*` modules. Pass dependencies from `cmd/server/main.go` instead.

