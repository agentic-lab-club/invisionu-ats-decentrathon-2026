package storage

import (
	"testing"

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
