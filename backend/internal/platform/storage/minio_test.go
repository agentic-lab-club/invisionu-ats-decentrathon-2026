package storage

import (
	"context"
	"io"
	"net/url"
	"testing"
	"time"

	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/config"
	"github.com/minio/minio-go/v7"
)

type fakeMinIOClient struct {
	bucketExistsResult bool
	bucketExistsErr    error
	makeBucketErr      error
	bucketExistsCalls  int
	makeBucketCalls    int
}

func (f *fakeMinIOClient) BucketExists(context.Context, string) (bool, error) {
	f.bucketExistsCalls++
	return f.bucketExistsResult, f.bucketExistsErr
}

func (f *fakeMinIOClient) MakeBucket(context.Context, string, minio.MakeBucketOptions) error {
	f.makeBucketCalls++
	return f.makeBucketErr
}

func (f *fakeMinIOClient) PutObject(context.Context, string, string, io.Reader, int64, minio.PutObjectOptions) (minio.UploadInfo, error) {
	return minio.UploadInfo{}, nil
}

func (f *fakeMinIOClient) GetObject(context.Context, string, string, minio.GetObjectOptions) (*minio.Object, error) {
	return nil, nil
}

func (f *fakeMinIOClient) PresignedGetObject(context.Context, string, string, time.Duration, url.Values) (*url.URL, error) {
	return nil, nil
}

func TestNewMinIOStorageBuildsClient(t *testing.T) {
	storage, err := NewMinIOStorage(config.StorageConfig{
		Endpoint:  "minio:9000",
		Region:    "us-east-1",
		Bucket:    "application-files",
		AccessKey: "minioadmin",
		SecretKey: "minioadmin",
		UseSSL:    false,
	})
	if err != nil {
		t.Fatalf("NewMinIOStorage returned error: %v", err)
	}
	if storage.bucket != "application-files" {
		t.Fatalf("expected bucket to be preserved, got %q", storage.bucket)
	}
}

func TestMinIOStoragePresignGetReturnsURL(t *testing.T) {
	storage, err := NewMinIOStorage(config.StorageConfig{
		Endpoint:  "minio:9000",
		Region:    "us-east-1",
		Bucket:    "application-files",
		AccessKey: "minioadmin",
		SecretKey: "minioadmin",
		UseSSL:    false,
	})
	if err != nil {
		t.Fatalf("NewMinIOStorage returned error: %v", err)
	}

	presignedURL, err := storage.PresignGet(context.Background(), "application-files", "demo.mp3", 5*time.Minute)
	if err != nil {
		t.Fatalf("PresignGet returned error: %v", err)
	}
	if presignedURL == "" {
		t.Fatal("expected non-empty presigned URL")
	}
}

func TestEnsureBucketCreatesMissingBucket(t *testing.T) {
	fakeClient := &fakeMinIOClient{bucketExistsResult: false}
	storage := &MinIOStorage{
		client: fakeClient,
		bucket: "application-files",
		region: "us-east-1",
	}

	if err := storage.EnsureBucket(context.Background()); err != nil {
		t.Fatalf("EnsureBucket returned error: %v", err)
	}
	if fakeClient.bucketExistsCalls != 1 {
		t.Fatalf("expected 1 bucket existence check, got %d", fakeClient.bucketExistsCalls)
	}
	if fakeClient.makeBucketCalls != 1 {
		t.Fatalf("expected 1 bucket creation attempt, got %d", fakeClient.makeBucketCalls)
	}
}

func TestEnsureBucketSkipsExistingBucket(t *testing.T) {
	fakeClient := &fakeMinIOClient{bucketExistsResult: true}
	storage := &MinIOStorage{
		client: fakeClient,
		bucket: "application-files",
		region: "us-east-1",
	}

	if err := storage.EnsureBucket(context.Background()); err != nil {
		t.Fatalf("EnsureBucket returned error: %v", err)
	}
	if fakeClient.bucketExistsCalls != 1 {
		t.Fatalf("expected 1 bucket existence check, got %d", fakeClient.bucketExistsCalls)
	}
	if fakeClient.makeBucketCalls != 0 {
		t.Fatalf("expected no bucket creation attempt, got %d", fakeClient.makeBucketCalls)
	}
}
