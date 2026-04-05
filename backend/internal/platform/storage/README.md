# Platform Storage Module Contract

## Purpose

Provide object storage upload/download primitives used by feature modules, currently the assets module.

## Responsibilities

- Define the `ObjectStorage` interface.
- Provide a MinIO-backed implementation.
- Return metadata needed by business modules to persist and serve files.
- Ensure the configured bucket exists before the backend serves upload requests.
- Support presigned GET URLs for downstream services.

## Out Of Scope

- Asset authorization.
- DB metadata persistence.
- Object deletion.
- Bucket lifecycle policies.

## Domain Concepts / Entities

### `UploadInput`

Fields:
- `file_name`
- `content_type`
- `size_bytes`
- `reader`

### `UploadResult`

Fields:
- `bucket`
- `object_key`
- `etag`

### `DownloadResult`

Fields:
- `reader`
- `content_type`
- `size_bytes`
- `etag`

### `ObjectStorage`

Interface:

```go
Upload(ctx context.Context, input UploadInput) (*UploadResult, error)
Download(ctx context.Context, bucket string, objectKey string) (*DownloadResult, error)
PresignGet(ctx context.Context, bucket string, objectKey string, expiry time.Duration, reqParams url.Values) (string, error)
```

## Endpoint Overview

- No HTTP endpoints.

## Auth / Roles

- Not applicable.

## Request / Response Conventions

- `Upload` consumes a stream and metadata and returns storage identifiers.
- `Download` consumes bucket/object key and returns a readable stream plus headers metadata.
- Success is signaled via non-nil result and `nil` error.

## Business Flows

### Upload flow

1. Extract file extension from original filename.
2. Generate `object_key` as `<uuid><lowercased extension>`.
3. Upload object to configured bucket through MinIO client.
4. Return bucket, object key, and trimmed ETag.

### Download flow

1. Fetch object by bucket and key.
2. Stat the object to obtain content metadata.
3. Return stream reader, content type, size, and trimmed ETag.

## Validation Rules

- This module does not validate file type, MIME type, or size policy.
- Caller must provide `size_bytes`.
- Constructor assumes storage config is valid.

## Lifecycle / State Transitions

- Bucket is ensured during backend startup.
- Objects are created on upload.
- This module does not implement update, copy, or delete transitions.

## Error Handling

- constructor wraps MinIO client init failure
- bucket-ensure flow wraps bucket existence and creation failures
- upload wraps object put failure
- download wraps:
  - object fetch failure
  - object stat failure

On download stat failure, opened object reader is closed before returning the error.

## Security Notes

- Access credentials come from backend config.
- Object keys are randomized UUID-based names rather than raw user filenames.
- Original filename is not used as storage key, only its extension is preserved.
- Presigned URLs are generated server-side and remain time-limited.

## Frontend Integration Notes

- Frontend does not call this module directly.
- Asset download headers seen by frontend are derived from `DownloadResult` through the assets module.

## Known Limitations / TODO

- No delete API.
- No checksum verification beyond stored ETag returned by the provider.

## Related Files / Modules

- `internal/platform/storage/storage.go`
- `internal/platform/storage/minio.go`
- `internal/assets`
- `cmd/server/main.go`
