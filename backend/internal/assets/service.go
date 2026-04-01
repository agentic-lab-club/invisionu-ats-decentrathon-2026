package assets

import (
	"context"
	"fmt"
	"mime/multipart"

	platformStorage "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/internal/platform/storage"
	"github.com/google/uuid"
)

type Service struct {
	repo    *Repository
	storage platformStorage.ObjectStorage
}

func NewService(repo *Repository, storage platformStorage.ObjectStorage) *Service {
	return &Service{repo: repo, storage: storage}
}

func (s *Service) Upload(ctx context.Context, userID uuid.UUID, fileType string, header *multipart.FileHeader) (*Response, error) {
	if !validateFileType(fileType) || fileType == FileTypeVideoAudio {
		return nil, fmt.Errorf("unsupported file type")
	}

	file, err := header.Open()
	if err != nil {
		return nil, fmt.Errorf("failed to open upload: %w", err)
	}
	defer file.Close()

	result, err := s.storage.Upload(ctx, platformStorage.UploadInput{
		FileName:    header.Filename,
		ContentType: header.Header.Get("Content-Type"),
		SizeBytes:   header.Size,
		Reader:      file,
	})
	if err != nil {
		return nil, err
	}

	record, err := s.repo.Create(newRecord(
		userID,
		fileType,
		result.Bucket,
		result.ObjectKey,
		header.Filename,
		header.Header.Get("Content-Type"),
		header.Size,
		result.ETag,
	))
	if err != nil {
		return nil, err
	}

	return &Response{
		FileID:           record.ID,
		FileType:         record.FileType,
		OriginalFilename: record.OriginalFilename,
	}, nil
}

func (s *Service) GetAsset(ctx context.Context, requesterID uuid.UUID, requesterRole string, assetID uuid.UUID) (*AssetContent, error) {
	record, err := s.repo.FindByID(assetID)
	if err != nil {
		return nil, err
	}
	if record == nil {
		return nil, fmt.Errorf("asset not found")
	}
	if requesterRole != "admin" && record.UploadedByUserID != requesterID {
		return nil, fmt.Errorf("forbidden")
	}

	object, err := s.storage.Download(ctx, record.BucketName, record.ObjectKey)
	if err != nil {
		return nil, err
	}

	record.ContentType = object.ContentType
	record.SizeBytes = object.SizeBytes
	record.ETag = object.ETag

	return &AssetContent{
		FileRecord: *record,
		Reader:     object.Reader,
	}, nil
}
