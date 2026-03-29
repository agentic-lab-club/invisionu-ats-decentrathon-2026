# Personality Test API Specification and Documentation

## Purpose and Scope

Owns read access to the current active personality test used by the applicant application flow.

## Swagger Tag

- `@personalitytest`

## Owned Routes

- `GET /tests/personality/current`

## External Dependencies

- PostgreSQL tables: `personality_tests`, `personality_test_questions`, `personality_test_options`

## Config and Env Keys Used

- none

## Migrations Added

- `db/migrations/20260329195000_ats_schema.sql`

## Module Tests

```bash
go test ./internal/personalitytest
```
