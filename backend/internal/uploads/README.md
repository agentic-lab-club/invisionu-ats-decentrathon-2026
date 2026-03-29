# Uploads API Specification and Documentation

## Purpose and Scope

Owns authenticated applicant file uploads and creation of unattached `application_files` records before application submission.

## Swagger Tag

- `@uploads`

## Owned Routes

- `POST /uploads`

## External Dependencies

- PostgreSQL table: `application_files`
- `internal/platform/storage` for object storage writes
- shared auth middleware for bearer access control

## Config and Env Keys Used

- `auth.jwt_access_secret`
- `auth.access_token_ttl_seconds`
- `storage.endpoint`
- `storage.bucket`
- `storage.access_key`
- `storage.secret_key`
- `storage.region`
- `storage.use_ssl`

## Migrations Added

- `db/migrations/20260329195000_ats_schema.sql`

## Module Tests

```bash
go test ./internal/uploads
```
