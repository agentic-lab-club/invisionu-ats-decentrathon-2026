package storage

import (
	"context"
	"io"
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

type ObjectStorage interface {
	Upload(ctx context.Context, input UploadInput) (*UploadResult, error)
}
