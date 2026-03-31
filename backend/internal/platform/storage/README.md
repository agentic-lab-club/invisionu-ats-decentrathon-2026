# Platform Storage Adapter Documentation

## Purpose and Scope

Provides object storage upload and download access for applicant assets.

## Business Rules

- Business modules depend on `ObjectStorage`, not directly on MinIO SDK.
- Upload returns bucket, object key, and etag.
- Download returns stream metadata needed to serve binary asset responses.

## Public Interface

- `Upload(ctx, input) (*UploadResult, error)`
- `Download(ctx, bucket, objectKey) (*DownloadResult, error)`

## Config and Env Keys Used

- `storage.provider`
- `storage.endpoint`
- `storage.region`
- `storage.bucket`
- `storage.access_key`
- `storage.secret_key`
- `storage.use_ssl`

## Module Tests

```bash
go test ./internal/platform/storage
```
