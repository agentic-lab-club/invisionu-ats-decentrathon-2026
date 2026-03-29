package uploads

import (
	"fmt"

	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/database"
	"github.com/google/uuid"
)

type Repository struct {
	db *database.TrackedDB
}

func NewRepository(db *database.TrackedDB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Create(record *FileRecord) (*FileRecord, error) {
	var created FileRecord
	err := r.db.TrackedGet(
		&created,
		r.db.Rebind(createFileRecordQuery),
		record.UploadedByUserID,
		record.ApplicationID,
		record.FileType,
		record.BucketName,
		record.ObjectKey,
		record.OriginalFilename,
		record.ContentType,
		record.SizeBytes,
		record.ETag,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create application file record: %w", err)
	}
	return &created, nil
}

func validateFileType(fileType string) bool {
	switch fileType {
	case FileTypeVideoPresentation, FileTypeVideoAudio, FileTypePortfolio, FileTypeEnglishResult, FileTypeCertificate:
		return true
	default:
		return false
	}
}

func newRecord(userID uuid.UUID, fileType string, bucketName string, objectKey string, originalFilename string, contentType string, sizeBytes int64, etag string) *FileRecord {
	return &FileRecord{
		UploadedByUserID: userID,
		FileType:         fileType,
		BucketName:       bucketName,
		ObjectKey:        objectKey,
		OriginalFilename: originalFilename,
		ContentType:      contentType,
		SizeBytes:        sizeBytes,
		ETag:             etag,
	}
}
