package storage

import (
	"context"
	"io"
	"time"
)

type UploadInput struct {
	FileName    string
	ContentType string
	SizeBytes   int64
	Reader      io.Reader
}

type UploadResult struct {
	Bucket    string
	ObjectKey string
	ETag      string
}

type DownloadResult struct {
	Reader      io.ReadCloser
	ContentType string
	SizeBytes   int64
	ETag        string
}

type ObjectStorage interface {
	Upload(ctx context.Context, input UploadInput) (*UploadResult, error)
	Download(ctx context.Context, bucket string, objectKey string) (*DownloadResult, error)
	PresignGet(ctx context.Context, bucket string, objectKey string, expiry time.Duration) (string, error)
}
