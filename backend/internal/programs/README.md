# Programs API Specification and Documentation

## Purpose and Scope

Owns the public read API for active ATS programs shown in the applicant form.

## Swagger Tag

- `@programs`

## Owned Routes

- `GET /api/v1/programs`

## External Dependencies

- PostgreSQL table: `programs`

## Config and Env Keys Used

- none

## Migrations Added

- `db/migrations/20260329195000_ats_schema.sql`

## Module Tests

```bash
go test ./internal/programs
```
