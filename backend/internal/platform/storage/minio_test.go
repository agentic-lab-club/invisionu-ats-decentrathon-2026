package storage

import (
	"context"
	"testing"
	"time"

	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/config"
)

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
