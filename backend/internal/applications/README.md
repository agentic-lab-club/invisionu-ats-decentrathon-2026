# Applications API Specification and Documentation

## Purpose and Scope

Owns applicant application submission and applicant-facing application status retrieval.

## Business Rules

- Only authenticated users with role `user` can submit applications.
- User email must be verified before application creation.
- Only one active application is allowed per user.
- Uploaded assets must belong to the same user and match expected file types.
- Valid personality test answers are required for submission.
- On successful create, backend publishes `application.submitted` through the configured bus or stub.

## Swagger Tag

- `@applications`

## Owned Routes

- `POST /applications/`
- `GET /applications/status`

## Auth Requirements

- Both routes require bearer token with role `user`

## Request and Response Examples

`POST /applications/`

- success:
  `{"application_id":"uuid"}`

`GET /applications/status`

- success:
  `{"application_id":"uuid","review_stage":"submitted","decision":"pending","program_code":"undergrad_tech"}`

## Error Cases

- `400`: invalid program, invalid assets, duplicate active application, invalid test answers
- `401`: missing or invalid bearer token
- `404`: no application status found
- `500`: unexpected status lookup errors

## External Dependencies

- PostgreSQL tables: `applications`, `application_files`, `application_test_answers`, `users`, `programs`
- `internal/platform/messaging` for `application.submitted`
- shared auth middleware for bearer access control

## Config and Env Keys Used

- `auth.jwt_access_secret`
- `auth.access_token_ttl_seconds`
- `messaging.enabled`
- `messaging.mode`
- `messaging.url`
- `messaging.exchange`
- `messaging.application_submitted_key`
- `llm.enabled`

## Migrations Added

- `db/migrations/20260329195000_ats_schema.sql`

## Module Tests

```bash
go test ./internal/applications
```
