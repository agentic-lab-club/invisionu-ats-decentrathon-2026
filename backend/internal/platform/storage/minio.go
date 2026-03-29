package storage

import (
	"context"
	"fmt"
	"path/filepath"
	"strings"

	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/config"
	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

type MinIOStorage struct {
	client *minio.Client
	bucket string
}

func NewMinIOStorage(cfg config.StorageConfig) (*MinIOStorage, error) {
	client, err := minio.New(cfg.Endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.AccessKey, cfg.SecretKey, ""),
		Secure: cfg.UseSSL,
		Region: cfg.Region,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to init minio client: %w", err)
	}

	return &MinIOStorage{
		client: client,
		bucket: cfg.Bucket,
	}, nil
}

func (s *MinIOStorage) Upload(ctx context.Context, input UploadInput) (*UploadResult, error) {
	extension := filepath.Ext(input.FileName)
	objectKey := fmt.Sprintf("%s%s", uuid.NewString(), strings.ToLower(extension))

	info, err := s.client.PutObject(ctx, s.bucket, objectKey, input.Reader, input.SizeBytes, minio.PutObjectOptions{
		ContentType: input.ContentType,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to upload object: %w", err)
	}

	return &UploadResult{
		Bucket:    s.bucket,
		ObjectKey: objectKey,
		ETag:      strings.Trim(info.ETag, "\""),
	}, nil
}
