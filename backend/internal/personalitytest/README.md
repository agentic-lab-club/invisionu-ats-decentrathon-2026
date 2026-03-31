# Personality Test API Specification and Documentation

## Purpose and Scope

Owns authenticated read access to the current active personality test used by the applicant application flow.

## Business Rules

- Route is available to authenticated `user` and `admin` roles.
- Only the current active test is returned.
- Questions include ordered options for frontend form rendering.

## Swagger Tag

- `@personalitytest`

## Owned Routes

- `GET /tests/personality/current`

## Auth Requirements

- Bearer token with role `user` or `admin`

## Request and Response Examples

`GET /tests/personality/current`

- success:
  `{"id":"uuid","code":"personality_v1","title":"Personality Test","questions":[...]}`

## Error Cases

- `401`: missing or invalid bearer token
- `404`: no active personality test found
- `500`: repository query failure

## External Dependencies

- PostgreSQL tables: `personality_tests`, `personality_test_questions`, `personality_test_options`
- shared auth middleware for bearer access control

## Config and Env Keys Used

- `auth.jwt_access_secret`
- `auth.access_token_ttl_seconds`

## Migrations Added

- `db/migrations/20260329195000_ats_schema.sql`

## Module Tests

```bash
go test ./internal/personalitytest
```
