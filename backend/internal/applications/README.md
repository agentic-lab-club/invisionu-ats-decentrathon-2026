# Applications API Specification and Documentation

## Purpose and Scope

Owns applicant application submission and applicant-facing application status retrieval.

## Swagger Tag

- `@applications`

## Owned Routes

- `POST /applications`
- `GET /applications/status`

## External Dependencies

- PostgreSQL tables: `applications`, `application_files`, `application_test_answers`, `users`, `programs`
- `internal/platform/messaging` for `application.submitted`
- shared auth middleware for bearer access control

## Config and Env Keys Used

- `auth.jwt_access_secret`
- `auth.access_token_ttl_seconds`
- `messaging.mode`
- `messaging.url`
- `messaging.exchange`

## Migrations Added

- `db/migrations/20260329195000_ats_schema.sql`

## Module Tests

```bash
go test ./internal/applications
```
