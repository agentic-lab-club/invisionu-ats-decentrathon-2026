package assets

import (
	"io"
	"time"

	"github.com/google/uuid"
)

const (
	FileTypeVideoPresentation = "video_presentation"
	FileTypeVideoAudio        = "video_audio"
	FileTypePortfolio         = "portfolio"
	FileTypeEnglishResult     = "english_result"
	FileTypeCertificate       = "certificate"
)

type FileRecord struct {
	ID               uuid.UUID  `db:"id" json:"file_id"`
	UploadedByUserID uuid.UUID  `db:"uploaded_by_user_id"`
	ApplicationID    *uuid.UUID `db:"application_id"`
	FileType         string     `db:"file_type" json:"file_type"`
	BucketName       string     `db:"bucket_name"`
	ObjectKey        string     `db:"object_key"`
	OriginalFilename string     `db:"original_filename" json:"original_filename"`
	ContentType      string     `db:"content_type"`
	SizeBytes        int64      `db:"size_bytes"`
	ETag             string     `db:"etag"`
	CreatedAt        time.Time  `db:"created_at"`
}

type Response struct {
	FileID           uuid.UUID `json:"file_id"`
	FileType         string    `json:"file_type"`
	OriginalFilename string    `json:"original_filename"`
}

type AssetContent struct {
	FileRecord
	Reader io.ReadCloser
}
