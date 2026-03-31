# Programs Module Contract

## Purpose

Own the authenticated read API for active admission programs used in the application form.

## Responsibilities

- Return active programs only.
- Preserve DB sort order for frontend selection lists.
- Expose stable program identifiers (`code`) used by the applications module.

## Out Of Scope

- Program creation/update/deactivation.
- Program detail endpoint.
- Public anonymous catalog access.

## Domain Concepts / Entities

### `Program`

Exposed fields:
- `id`
- `level`
- `code`
- `name`

Stored but not exposed in JSON:
- `is_active`
- `sort_order`

## Endpoint Overview

### `GET /api/v1/programs`

Return all active programs.

Success example:

```json
{
  "items": [
    {
      "id": 1,
      "level": "undergraduate",
      "code": "undergrad_tech",
      "name": "Tech (Innovative IT Product Design and Development)"
    }
  ]
}
```

## Auth / Roles

- Bearer token required.
- Allowed roles: `user`, `admin`.

## Request / Response Conventions

- No request body.
- No query params.
- Response is JSON object with `items`.
- Programs are ordered by `sort_order ASC, id ASC` in repository SQL.

## Business Flows

1. Auth middleware validates bearer token.
2. Repository selects rows where `is_active = TRUE`.
3. Handler returns `ListResponse{items}`.

## Validation Rules

- No user-supplied input other than bearer token.

## Lifecycle / State Transitions

- This module is read-only.
- Program activation/deactivation lifecycle is managed outside this module.

## Error Handling

- `401 Unauthorized`
  - missing or invalid bearer token
- `500 Internal Server Error`
  - repository query failure

## Security Notes

- Program list is not public; callers must be authenticated.
- Returned data is low sensitivity reference data.

## Frontend Integration Notes

- Use `code` as the value submitted to the applications module.
- Do not rely on hidden fields like `sort_order`; backend does not expose them.
- Both applicant and admin flows can call the same endpoint.

## Known Limitations / TODO

- No per-program detail endpoint.
- No public unauthenticated access.
- No explicit versioning for program catalog changes.

## Related Files / Modules

- `internal/programs/module.go`
- `internal/programs/handler.go`
- `internal/programs/service.go`
- `internal/programs/repository.go`
- `internal/programs/domain.go`
- `internal/programs/queries.go`
- `internal/applications`
- `internal/seeder`
