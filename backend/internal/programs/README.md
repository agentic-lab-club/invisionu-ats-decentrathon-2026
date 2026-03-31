# Programs API Specification and Documentation

## Purpose and Scope

Owns the authenticated read API for active ATS programs shown in the applicant form.

## Business Rules

- Route is available to authenticated `user` and `admin` roles.
- Only active programs are returned.
- Results are sorted for frontend form rendering.

## Swagger Tag

- `@programs`

## Owned Routes

- `GET /api/v1/programs`

## Auth Requirements

- Bearer token with role `user` or `admin`

## Request and Response Examples

`GET /api/v1/programs`

- success:
  `{"items":[{"code":"undergrad_tech","name":"Tech (Innovative IT Product Design and Development)"}]}`

## Error Cases

- `401`: missing or invalid bearer token
- `500`: repository query failure

## External Dependencies

- PostgreSQL table: `programs`
- shared auth middleware for bearer access control

## Config and Env Keys Used

- `auth.jwt_access_secret`
- `auth.access_token_ttl_seconds`

## Migrations Added

- `db/migrations/20260329195000_ats_schema.sql`

## Module Tests

```bash
go test ./internal/programs
```
