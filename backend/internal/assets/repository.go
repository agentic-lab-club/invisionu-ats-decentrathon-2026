package assets

import (
	"database/sql"
	"errors"
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

func (r *Repository) FindByID(id uuid.UUID) (*FileRecord, error) {
	var record FileRecord
	err := r.db.TrackedGet(&record, r.db.Rebind(`
		SELECT id,
		       uploaded_by_user_id,
		       application_id,
		       file_type,
		       bucket_name,
		       object_key,
		       original_filename,
		       content_type,
		       size_bytes,
		       etag,
		       created_at
		FROM application_files
		WHERE id = $1
	`), id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to find application file: %w", err)
	}
	return &record, nil
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
