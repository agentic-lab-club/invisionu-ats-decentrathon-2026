# Assets API Specification and Documentation

## Purpose and Scope

Owns authenticated applicant asset upload and retrieval for unattached `application_files` records before application submission.

## Business Rules

- Only authenticated users can upload assets.
- Applicants can read only their own assets.
- Admin reviewers can read any asset by ID.
- `video_audio` is not accepted through the public upload endpoint.
- Legacy `POST /uploads` is removed and must return `404`.

## Swagger Tag

- `@assets`

## Owned Routes

- `POST /assets`
- `GET /assets/:id`

## Auth Requirements

- `POST /assets`: `user`
- `GET /assets/:id`: `user` owner or `admin`

## Request and Response Examples

`POST /assets`

- multipart fields:
  `file_type=portfolio`
  `file=<binary>`
- success:
  `{"file_id":"uuid","file_type":"portfolio","original_filename":"portfolio.pdf"}`

`GET /assets/:id`

- success: binary stream with `Content-Type`, `Content-Disposition`, and `ETag`

## Error Cases

- `400`: missing file, unsupported file type, invalid asset id
- `401`: missing or invalid bearer token
- `403`: asset does not belong to current user
- `404`: asset not found, old `/uploads` route

## External Dependencies

- PostgreSQL table: `application_files`
- `internal/platform/storage` for object storage reads/writes
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
go test ./internal/assets
```
