# Candidates API Specification and Documentation

## Purpose and Scope

Owns admin reviewer APIs: candidate list, candidate detail, and candidate stage updates.

## Business Rules

- All routes are admin-only.
- Candidate detail is addressed by `applicationId`.
- Stage update accepts a new review stage and optional decision.
- Candidate list supports filtering by program, review stage, decision, and search term.

## Swagger Tag

- `@candidates`

## Owned Routes

- `GET /candidates/`
- `GET /candidates/{applicationId}`
- `PATCH /candidates/{applicationId}/stage`

## Auth Requirements

- Bearer token with role `admin` for all routes

## Request and Response Examples

`GET /candidates/`

- success:
  `{"items":[{"application_id":"uuid","applicant_email":"user@example.com","review_stage":"submitted"}]}`

`PATCH /candidates/{applicationId}/stage`

- request:
  `{"review_stage":"shortlisted","decision":"pending"}`

## Error Cases

- `400`: invalid application id, invalid stage update payload
- `401`: missing or invalid bearer token
- `403`: non-admin token
- `404`: candidate not found
- `500`: list/detail query failures

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
