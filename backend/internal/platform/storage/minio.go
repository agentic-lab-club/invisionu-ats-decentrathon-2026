package storage

import (
	"context"
	"fmt"
	"net/url"
	"path/filepath"
	"strings"
	"time"

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

func (s *MinIOStorage) Download(ctx context.Context, bucket string, objectKey string) (*DownloadResult, error) {
	object, err := s.client.GetObject(ctx, bucket, objectKey, minio.GetObjectOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get object: %w", err)
	}

	info, err := object.Stat()
	if err != nil {
		_ = object.Close()
		return nil, fmt.Errorf("failed to stat object: %w", err)
	}

	return &DownloadResult{
		Reader:      object,
		ContentType: info.ContentType,
		SizeBytes:   info.Size,
		ETag:        strings.Trim(info.ETag, "\""),
	}, nil
}

func (s *MinIOStorage) PresignGet(ctx context.Context, bucket string, objectKey string, expiry time.Duration) (string, error) {
	presignedURL, err := s.client.PresignedGetObject(ctx, bucket, objectKey, expiry, url.Values{})
	if err != nil {
		return "", fmt.Errorf("failed to presign object download: %w", err)
	}
	return presignedURL.String(), nil
}
