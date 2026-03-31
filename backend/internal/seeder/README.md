# Seeder Documentation

## Purpose and Scope

Owns idempotent seeding of default backend reference data required for local startup and repeatable development environments.

## Business Rules

- Seeder runs during server startup.
- Repeated runs must not duplicate programs or personality test records.
- Existing program rows are upserted by code.
- Existing personality test content is updated in place and reactivated by code.

## Owned Entry Points

- startup invocation from `cmd/server`
- manual invocation from `cmd/seed`

## External Dependencies

- PostgreSQL tables: `programs`, `personality_tests`, `personality_test_questions`, `personality_test_options`
- embedded JSON data under `internal/seeder/data`

## Config and Env Keys Used

- `database.*`

## Migrations Added

- `db/migrations/20260329195000_ats_schema.sql`

## Module Tests

```bash
go test ./internal/seeder
```
