# Assets Module Contract

## Purpose

Own authenticated asset upload and asset retrieval for files stored in `application_files` before they are attached to an application.

This module is the backend contract for:
- frontend file upload before application submission
- frontend/admin asset preview by file id
- AI agents that need to reason about file ownership and file access rules

## Responsibilities

- Accept multipart asset uploads from authenticated applicants.
- Persist uploaded file metadata in `application_files`.
- Store binary content through the shared object storage adapter.
- Return uploaded asset binaries by file id.
- Enforce ownership for applicant reads and elevated read access for admins.

## Out Of Scope

- Attaching files to an application after upload.
- Updating or deleting assets.
- Public or anonymous asset access.
- Asset search/list endpoints.
- MIME normalization, antivirus scanning, transcoding, or content inspection.
- CDN distribution.

## Domain Concepts / Entities

### `FileRecord`

Represents one row in `application_files`.

Key fields used by this module:
- `id`
- `uploaded_by_user_id`
- `application_id`
- `file_type`
- `bucket_name`
- `object_key`
- `original_filename`
- `content_type`
- `size_bytes`
- `etag`
- `created_at`

Important behavior:
- uploaded records are created with `application_id = NULL`
- ownership is determined by `uploaded_by_user_id`

### `AssetContent`

Read model returned by service download flow:
- wraps the stored `FileRecord`
- includes an open binary `Reader`

### Supported file types

Known file type constants in code:
- `video_presentation`
- `video_audio`
- `portfolio`
- `english_result`
- `certificate`

Current public upload rule:
- `video_audio` exists as a domain constant but is explicitly rejected by `POST /assets`

## Endpoint Overview

### `POST /assets`

Upload one asset for the authenticated user.

- Method: `POST`
- Content-Type: `multipart/form-data`
- Auth: required
- Allowed role: `user`
- Success: `201 Created`

Required multipart fields:
- `file_type`
- `file`

Success response example:

```json
{
  "file_id": "11111111-1111-1111-1111-111111111111",
  "file_type": "portfolio",
  "original_filename": "portfolio.pdf"
}
```

### `GET /assets/:id`

Download one asset by file id.

- Method: `GET`
- Auth: required
- Allowed roles: `user`, `admin`
- Path param `id` must be a UUID
- Success: `200 OK`

Successful response is a binary stream, not JSON.

Response headers set by handler:
- `Content-Type`
- `Content-Disposition: inline; filename="<original filename>"`
- `ETag`

## Auth / Roles

Route-level auth is enforced in `module.go` with shared auth middleware.

- `POST /assets`
  - requires authenticated role `user`
- `GET /assets/:id`
  - requires authenticated role `user` or `admin`

Read access rules in service layer:
- `admin` can fetch any asset by id
- non-admin user can fetch only assets where `uploaded_by_user_id == requester id`

Unknown:
- no finer-grained admin role separation exists inside this module

## Request / Response Conventions

### Upload request

Example multipart fields:

```text
file_type=portfolio
file=<binary>
```

Upload response format:

```json
{
  "file_id": "uuid",
  "file_type": "portfolio",
  "original_filename": "portfolio.pdf"
}
```

### Download response

Binary stream response:
- body is raw file content
- status `200`
- no JSON envelope

### Error response shape

Errors are produced through shared responder helpers.

This module relies on shared error formatting and does not define its own explicit JSON schema here.
Frontend should treat the exact error body shape as shared platform behavior, not a module-local contract.

## Business Flows

### Upload flow

1. Auth middleware resolves authenticated user id.
2. Handler reads multipart `file_type`.
3. Handler requires multipart `file`.
4. Service validates `file_type`.
5. Service opens the uploaded file stream.
6. Service uploads binary content through `platform/storage.ObjectStorage`.
7. Service creates a new `application_files` row with no `application_id`.
8. Handler returns `201` with `file_id`, `file_type`, and `original_filename`.

### Download flow

1. Auth middleware resolves requester id and role.
2. Param middleware validates `:id` as UUID.
3. Service loads the file record from `application_files`.
4. Service checks ownership unless requester role is `admin`.
5. Service downloads binary content from object storage.
6. Handler streams the file with content headers.

## Validation Rules

Code-backed validation currently implemented:

- `file` multipart part is required
- `file_type` must match one of the known constants
- `video_audio` is rejected even though it is a known constant
- `:id` must be a valid UUID for `GET /assets/:id`

Unknown / not enforced in this module:
- max file size
- MIME allowlist
- file extension allowlist
- duplicate upload policy
- per-user upload quota

## Lifecycle / State Transitions

This module manages only the pre-attachment phase of a file.

Observed lifecycle from code:

1. `uploaded`
   - file is stored in object storage
   - DB row is created in `application_files`
   - `application_id` is `NULL`
2. `attached to application`
   - implied by `application_id` becoming non-null elsewhere
   - this transition is not handled in this module

This module does not implement:
- deletion state
- archive state
- expiration state

## Error Handling

Status mapping visible in handler code:

- `400 Bad Request`
  - missing `file`
  - unsupported `file_type`
  - invalid UUID param
  - storage/repository errors that are not reclassified by handler
- `401 Unauthorized`
  - missing or invalid auth context
- `403 Forbidden`
  - authenticated user tries to read another user's asset
- `404 Not Found`
  - asset record not found

Notes:
- download handler classifies errors by substring matching for `"not found"` and `"forbidden"`
- storage-layer download failures are passed through and may currently surface as `400` unless they contain those substrings

## Security Notes

- Asset endpoints are not public.
- Ownership is checked in service layer, not only at routing layer.
- Admin read access bypasses ownership checks.
- Returned filename is inserted into `Content-Disposition` using quoted filename output.

Unknown / not implemented here:
- malware scanning
- content hashing beyond storage `ETag`
- audit logging specific to asset access

## Frontend Integration Notes

- Use `multipart/form-data` for upload.
- Send `file_type` exactly as backend constants expect.
- Treat uploaded asset as an opaque `file_id`; later attachment to an application happens outside this module.
- For download/preview, call `GET /assets/:id` and expect a binary response stream, not JSON.
- Frontend should handle `401` by re-auth flow and `403` as ownership/access denial.
- `video_audio` should not be offered through the public upload UI unless backend behavior changes.

## Known Limitations / TODO

- No delete endpoint.
- No update/replace endpoint.
- No asset list endpoint.
- Upload policy is minimal; there is no module-local file size or MIME enforcement.
- Error classification for storage/repository failures is coarse.
- `video_audio` remains a domain constant but is blocked in public upload; reason is not documented in code.

## Related Files / Modules

Primary files:
- `internal/assets/module.go`
- `internal/assets/handler.go`
- `internal/assets/service.go`
- `internal/assets/repository.go`
- `internal/assets/domain.go`

Direct dependencies:
- `internal/platform/storage/storage.go`
- shared auth middleware in `pkg/http/middlewares`
- shared responder helpers in `pkg/http/responder`
- tracked DB access in `pkg/database`

Storage and persistence dependencies:
- object storage implementation wired at app startup
- PostgreSQL table `application_files`
