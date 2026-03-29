# Candidates API Specification and Documentation

## Purpose and Scope

Owns admin candidate review APIs: candidate list, candidate detail, and review stage or decision updates.

## Swagger Tag

- `@candidates`

## Owned Routes

- `GET /candidates`
- `GET /candidates/{applicationId}`
- `PATCH /candidates/{applicationId}/stage`

## External Dependencies

- PostgreSQL tables: `applications`, `users`, `programs`, `application_files`, `scoring_runs`
- shared auth middleware for admin bearer access control

## Config and Env Keys Used

- `auth.jwt_access_secret`
- `auth.access_token_ttl_seconds`

## Migrations Added

- `db/migrations/20260329195000_ats_schema.sql`

## Module Tests

```bash
go test ./internal/candidates
```
