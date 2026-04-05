package applications

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	platformStorage "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/internal/platform/storage"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/config"
	"github.com/google/uuid"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

type AudioExtractor interface {
	Extract(ctx context.Context, videoPath string) (string, error)
}

type FFmpegAudioExtractor struct{}

func (FFmpegAudioExtractor) Extract(ctx context.Context, videoPath string) (string, error) {
	outputPath := strings.TrimSuffix(videoPath, filepath.Ext(videoPath)) + ".mp3"
	cmd := exec.CommandContext(
		ctx,
		"ffmpeg",
		"-y",
		"-loglevel", "error",
		"-i", videoPath,
		"-vn",
		"-acodec", "libmp3lame",
		"-ar", "16000",
		"-ac", "1",
		outputPath,
	)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("failed to extract audio with ffmpeg: %w: %s", err, strings.TrimSpace(string(output)))
	}
	return outputPath, nil
}

type STTClient struct {
	baseURL    string
	httpClient *http.Client
}

func NewSTTClient(baseURL string, httpClient *http.Client) *STTClient {
	if strings.TrimSpace(baseURL) == "" || httpClient == nil {
		return nil
	}
	return &STTClient{
		baseURL:    strings.TrimRight(baseURL, "/"),
		httpClient: httpClient,
	}
}

func (c *STTClient) Transcribe(ctx context.Context, fileURL string) (string, error) {
	payload, err := json.Marshal(map[string]string{"file_url": fileURL})
	if err != nil {
		return "", fmt.Errorf("failed to marshal stt request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/transcribe", bytes.NewReader(payload))
	if err != nil {
		return "", fmt.Errorf("failed to create stt request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to call stt service: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read stt response: %w", err)
	}
	if resp.StatusCode >= http.StatusBadRequest {
		return "", fmt.Errorf("stt service returned status %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var parsed struct {
		Text string `json:"text"`
	}
	if err := json.Unmarshal(body, &parsed); err != nil {
		return "", fmt.Errorf("failed to decode stt response: %w", err)
	}
	if strings.TrimSpace(parsed.Text) == "" {
		return "", fmt.Errorf("stt service returned empty transcription")
	}
	return parsed.Text, nil
}

type LLMScoringClient struct {
	baseURL    string
	httpClient *http.Client
}

type AIDetectClient struct {
	baseURL    string
	httpClient *http.Client
}

type ParserClient struct {
	baseURL    string
	httpClient *http.Client
}

type ParseScoreResponse struct {
	Score  *float64 `json:"score"`
	Status string   `json:"status"`
	Error  *string  `json:"error"`
}

func NewLLMScoringClient(baseURL string, httpClient *http.Client) *LLMScoringClient {
	if strings.TrimSpace(baseURL) == "" || httpClient == nil {
		return nil
	}
	return &LLMScoringClient{
		baseURL:    strings.TrimRight(baseURL, "/"),
		httpClient: httpClient,
	}
}

func (c *LLMScoringClient) Analyze(ctx context.Context, transcript string) (JSONMap, error) {
	payload, err := json.Marshal(map[string]string{"input_data": transcript})
	if err != nil {
		return nil, fmt.Errorf("failed to marshal llm request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/analyze", bytes.NewReader(payload))
	if err != nil {
		return nil, fmt.Errorf("failed to create llm request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to call llm scoring service: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read llm scoring response: %w", err)
	}
	if resp.StatusCode >= http.StatusBadRequest {
		return nil, fmt.Errorf("llm scoring service returned status %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var parsed JSONMap
	if err := json.Unmarshal(body, &parsed); err != nil {
		return nil, fmt.Errorf("failed to decode llm scoring response: %w", err)
	}
	if err := validateLLMScoringResult(parsed); err != nil {
		return nil, err
	}
	return parsed, nil
}

func NewAIDetectClient(baseURL string, httpClient *http.Client) *AIDetectClient {
	if strings.TrimSpace(baseURL) == "" || httpClient == nil {
		return nil
	}
	return &AIDetectClient{
		baseURL:    strings.TrimRight(baseURL, "/"),
		httpClient: httpClient,
	}
}

func (c *AIDetectClient) Detect(ctx context.Context, transcript string) (JSONMap, float64, error) {
	payload, err := json.Marshal(map[string]string{"text": transcript})
	if err != nil {
		return nil, 0, fmt.Errorf("failed to marshal ai detect request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/detect", bytes.NewReader(payload))
	if err != nil {
		return nil, 0, fmt.Errorf("failed to create ai detect request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to call ai detect service: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to read ai detect response: %w", err)
	}
	if resp.StatusCode >= http.StatusBadRequest {
		return nil, 0, fmt.Errorf("ai detect service returned status %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var parsed JSONMap
	if err := json.Unmarshal(body, &parsed); err != nil {
		return nil, 0, fmt.Errorf("failed to decode ai detect response: %w", err)
	}

	probability, ok := asFloat64(parsed["ai_probs"])
	if !ok {
		return nil, 0, fmt.Errorf("ai detect service returned invalid ai_probs payload")
	}
	return parsed, probability, nil
}

func NewParserClient(baseURL string, httpClient *http.Client) *ParserClient {
	if strings.TrimSpace(baseURL) == "" || httpClient == nil {
		return nil
	}
	return &ParserClient{
		baseURL:    strings.TrimRight(baseURL, "/"),
		httpClient: httpClient,
	}
}

func (c *ParserClient) Parse(ctx context.Context, fileURL string, scoreType string) (JSONMap, ParseScoreResponse, error) {
	payload, err := json.Marshal(map[string]string{
		"file_url":   fileURL,
		"score_type": scoreType,
	})
	if err != nil {
		return nil, ParseScoreResponse{}, fmt.Errorf("failed to marshal parser request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/parse-score", bytes.NewReader(payload))
	if err != nil {
		return nil, ParseScoreResponse{}, fmt.Errorf("failed to create parser request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, ParseScoreResponse{}, fmt.Errorf("failed to call parser service: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, ParseScoreResponse{}, fmt.Errorf("failed to read parser response: %w", err)
	}
	if resp.StatusCode >= http.StatusBadRequest {
		return nil, ParseScoreResponse{}, fmt.Errorf("parser service returned status %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var parsed JSONMap
	if err := json.Unmarshal(body, &parsed); err != nil {
		return nil, ParseScoreResponse{}, fmt.Errorf("failed to decode parser payload: %w", err)
	}

	var result ParseScoreResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, ParseScoreResponse{}, fmt.Errorf("failed to decode parser response: %w", err)
	}

	return parsed, result, nil
}

type ScreeningProcessor struct {
	repo           *Repository
	storage        platformStorage.ObjectStorage
	audioExtractor AudioExtractor
	sttClient      *STTClient
	llmClient      *LLMScoringClient
	aiDetectClient *AIDetectClient
	parserClient   *ParserClient
	presignTTL     time.Duration
}

func NewScreeningProcessor(repo *Repository, objectStorage platformStorage.ObjectStorage, cfg *config.Config) *ScreeningProcessor {
	if repo == nil || repo.db == nil || objectStorage == nil || cfg == nil {
		return nil
	}

	httpClient := &http.Client{
		Timeout: time.Duration(cfg.Screening.RequestTimeoutSecs) * time.Second,
	}

	sttClient := NewSTTClient(cfg.Screening.STTBaseURL, httpClient)
	llmClient := NewLLMScoringClient(cfg.Screening.LLMBaseURL, httpClient)
	if sttClient == nil || llmClient == nil {
		return nil
	}

	return &ScreeningProcessor{
		repo:           repo,
		storage:        objectStorage,
		audioExtractor: FFmpegAudioExtractor{},
		sttClient:      sttClient,
		llmClient:      llmClient,
		aiDetectClient: NewAIDetectClient(cfg.Screening.AIDetectBaseURL, httpClient),
		parserClient:   NewParserClient(cfg.Screening.ParserBaseURL, httpClient),
		presignTTL:     time.Duration(cfg.Screening.PresignTTLSeconds) * time.Second,
	}
}

func (p *ScreeningProcessor) Start(applicationID uuid.UUID, userID uuid.UUID, videoFileID uuid.UUID, englishResultFileID *uuid.UUID, certificateFileID *uuid.UUID) {
	go p.process(applicationID, userID, videoFileID, englishResultFileID, certificateFileID)
}

func (p *ScreeningProcessor) process(applicationID uuid.UUID, userID uuid.UUID, videoFileID uuid.UUID, englishResultFileID *uuid.UUID, certificateFileID *uuid.UUID) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Minute)
	defer cancel()

	logger := log.With().
		Str("event", "applications_screening_pipeline").
		Str("application_id", applicationID.String()).
		Str("video_file_id", videoFileID.String()).
		Logger()

	logger.Info().Msg("starting async screening pipeline")

	if err := p.repo.UpdateApplicationScreening(applicationID, ScreeningStatusProcessing, nil); err != nil {
		logger.Error().Err(err).Msg("failed to mark screening as processing")
		return
	}

	videoFile, err := p.repo.FindFileByID(videoFileID)
	if err != nil {
		p.fail(applicationID, logger, fmt.Errorf("failed to load source video: %w", err))
		return
	}
	if videoFile == nil {
		p.fail(applicationID, logger, fmt.Errorf("source video file not found"))
		return
	}

	logger.Info().Msg("downloading source video from object storage")
	downloaded, err := p.storage.Download(ctx, videoFile.BucketName, videoFile.ObjectKey)
	if err != nil {
		p.fail(applicationID, logger, fmt.Errorf("failed to download source video: %w", err))
		return
	}
	defer downloaded.Reader.Close()

	videoPath, err := writeStreamToTempFile(downloaded.Reader, videoFile.OriginalFilename)
	if err != nil {
		p.fail(applicationID, logger, fmt.Errorf("failed to persist source video temporarily: %w", err))
		return
	}
	defer os.Remove(videoPath)

	logger.Info().Msg("extracting audio with ffmpeg")
	audioPath, err := p.audioExtractor.Extract(ctx, videoPath)
	if err != nil {
		p.fail(applicationID, logger, err)
		return
	}
	defer os.Remove(audioPath)

	audioRecord, err := p.uploadDerivedAudio(ctx, applicationID, userID, audioPath)
	if err != nil {
		p.fail(applicationID, logger, err)
		return
	}

	logger.Info().Str("audio_file_id", audioRecord.ID.String()).Msg("audio extracted and uploaded")

	presignedURL, err := p.storage.PresignGet(ctx, audioRecord.BucketName, audioRecord.ObjectKey, p.presignTTL)
	if err != nil {
		p.fail(applicationID, logger, fmt.Errorf("failed to presign derived audio: %w", err))
		return
	}

	logger.Info().Msg("calling stt service")
	transcript, err := p.sttClient.Transcribe(ctx, presignedURL)
	if err != nil {
		p.fail(applicationID, logger, err)
		return
	}

	if err := p.repo.UpdateApplicationTranscript(applicationID, transcript); err != nil {
		p.fail(applicationID, logger, fmt.Errorf("failed to save transcript: %w", err))
		return
	}

	p.runBestEffortEnrichment(ctx, logger, applicationID, transcript, englishResultFileID, certificateFileID)

	logger.Info().Msg("calling llm scoring service")
	llmResult, err := p.llmClient.Analyze(ctx, transcript)
	if err != nil {
		p.fail(applicationID, logger, err)
		return
	}

	if err := p.repo.CreateScoringRun(&ScoringRun{
		ID:             uuid.New(),
		ApplicationID:  applicationID,
		ModelName:      "llmscoring",
		ResultJSON:     llmResult,
		Recommendation: nil,
		CreatedAt:      time.Now().UTC(),
	}); err != nil {
		p.fail(applicationID, logger, fmt.Errorf("failed to save llm scoring run: %w", err))
		return
	}

	if err := p.repo.UpdateApplicationScreening(applicationID, ScreeningStatusCompleted, nil); err != nil {
		p.fail(applicationID, logger, fmt.Errorf("failed to mark screening as completed: %w", err))
		return
	}

	logger.Info().Msg("screening pipeline completed successfully")
}

func (p *ScreeningProcessor) runBestEffortEnrichment(ctx context.Context, logger zerolog.Logger, applicationID uuid.UUID, transcript string, englishResultFileID *uuid.UUID, certificateFileID *uuid.UUID) {
	p.runAIDetect(ctx, logger, applicationID, transcript)
	p.runParser(ctx, logger, applicationID, englishResultFileID, "IELTS", "parser_ielts")
	p.runParser(ctx, logger, applicationID, certificateFileID, "ENT", "parser_ent")
}

func (p *ScreeningProcessor) runAIDetect(ctx context.Context, logger zerolog.Logger, applicationID uuid.UUID, transcript string) {
	if p.aiDetectClient == nil || strings.TrimSpace(transcript) == "" {
		return
	}

	result, probability, err := p.aiDetectClient.Detect(ctx, transcript)
	if err != nil {
		logger.Warn().Err(err).Msg("ai detect enrichment failed")
		return
	}

	if err := p.repo.UpdateApplicationAIProbability(applicationID, probability); err != nil {
		logger.Warn().Err(err).Msg("failed to persist ai probability")
	}

	if err := p.repo.CreateScoringRun(&ScoringRun{
		ID:             uuid.New(),
		ApplicationID:  applicationID,
		ModelName:      "aidetect",
		ResultJSON:     result,
		Recommendation: nil,
		CreatedAt:      time.Now().UTC(),
	}); err != nil {
		logger.Warn().Err(err).Msg("failed to persist ai detect scoring run")
	}
}

func (p *ScreeningProcessor) runParser(ctx context.Context, logger zerolog.Logger, applicationID uuid.UUID, fileID *uuid.UUID, scoreType string, modelName string) {
	if p.parserClient == nil || fileID == nil {
		return
	}

	file, err := p.repo.FindFileByID(*fileID)
	if err != nil {
		logger.Warn().Err(err).Str("score_type", scoreType).Msg("failed to load parser source file")
		return
	}
	if file == nil {
		logger.Warn().Str("score_type", scoreType).Msg("parser source file not found")
		return
	}

	presignedURL, err := p.storage.PresignGet(ctx, file.BucketName, file.ObjectKey, p.presignTTL)
	if err != nil {
		logger.Warn().Err(err).Str("score_type", scoreType).Msg("failed to presign parser source file")
		return
	}

	result, parsed, err := p.parserClient.Parse(ctx, presignedURL, scoreType)
	if err != nil {
		logger.Warn().Err(err).Str("score_type", scoreType).Msg("parser enrichment failed")
		return
	}

	if err := p.repo.CreateScoringRun(&ScoringRun{
		ID:             uuid.New(),
		ApplicationID:  applicationID,
		ModelName:      modelName,
		ResultJSON:     result,
		Recommendation: nil,
		CreatedAt:      time.Now().UTC(),
	}); err != nil {
		logger.Warn().Err(err).Str("score_type", scoreType).Msg("failed to persist parser scoring run")
	}

	if strings.TrimSpace(strings.ToLower(parsed.Status)) != "ok" || parsed.Score == nil {
		logger.Info().
			Str("score_type", scoreType).
			Str("parser_status", parsed.Status).
			Msg("parser did not return a normalized score")
		return
	}

	switch scoreType {
	case "IELTS":
		if err := p.repo.UpdateApplicationIELTSScore(applicationID, *parsed.Score); err != nil {
			logger.Warn().Err(err).Msg("failed to persist ielts score")
		}
	case "ENT":
		if err := p.repo.UpdateApplicationENTScore(applicationID, int(math.Round(*parsed.Score))); err != nil {
			logger.Warn().Err(err).Msg("failed to persist ent score")
		}
	}
}

func (p *ScreeningProcessor) uploadDerivedAudio(ctx context.Context, applicationID uuid.UUID, userID uuid.UUID, audioPath string) (*FileRecord, error) {
	audioFile, err := os.Open(audioPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open extracted audio: %w", err)
	}
	defer audioFile.Close()

	audioInfo, err := audioFile.Stat()
	if err != nil {
		return nil, fmt.Errorf("failed to stat extracted audio: %w", err)
	}

	uploadResult, err := p.storage.Upload(ctx, platformStorage.UploadInput{
		FileName:    filepath.Base(audioPath),
		ContentType: "audio/mpeg",
		SizeBytes:   audioInfo.Size(),
		Reader:      audioFile,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to upload extracted audio: %w", err)
	}

	audioRecord, err := p.repo.CreateApplicationFile(&FileRecord{
		UploadedByUserID: userID,
		ApplicationID:    &applicationID,
		FileType:         FileTypeVideoAudio,
		BucketName:       uploadResult.Bucket,
		ObjectKey:        uploadResult.ObjectKey,
		OriginalFilename: filepath.Base(audioPath),
		ContentType:      "audio/mpeg",
		SizeBytes:        audioInfo.Size(),
		ETag:             uploadResult.ETag,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to persist extracted audio metadata: %w", err)
	}

	if err := p.repo.UpdateApplicationAudioFile(applicationID, audioRecord.ID); err != nil {
		return nil, err
	}

	return audioRecord, nil
}

func (p *ScreeningProcessor) fail(applicationID uuid.UUID, logger zerolog.Logger, err error) {
	message := truncateForDB(err.Error())
	if updateErr := p.repo.UpdateApplicationScreening(applicationID, ScreeningStatusFailed, &message); updateErr != nil {
		logger.Error().Err(updateErr).Msg("failed to persist screening error")
	}
	logger.Error().Err(err).Msg("screening pipeline failed")
}

func writeStreamToTempFile(reader io.Reader, originalFilename string) (string, error) {
	extension := filepath.Ext(originalFilename)
	tempFile, err := os.CreateTemp("", "application-video-*"+extension)
	if err != nil {
		return "", fmt.Errorf("failed to create temp file: %w", err)
	}
	defer tempFile.Close()

	if _, err := io.Copy(tempFile, reader); err != nil {
		_ = os.Remove(tempFile.Name())
		return "", fmt.Errorf("failed to copy stream to temp file: %w", err)
	}

	return tempFile.Name(), nil
}

func truncateForDB(value string) string {
	trimmed := strings.TrimSpace(value)
	if len(trimmed) <= 2000 {
		return trimmed
	}
	return trimmed[:2000]
}

func validateLLMScoringResult(result JSONMap) error {
	if len(result) == 0 {
		return fmt.Errorf("llm scoring service returned empty result")
	}

	workflowStatus, _ := result["workflow_status"].(string)
	if strings.TrimSpace(workflowStatus) != "success" {
		return fmt.Errorf("llm scoring service returned workflow_status=%q", workflowStatus)
	}

	rawBreakdown, ok := result["candidate_breakdown"].(map[string]interface{})
	if !ok {
		return fmt.Errorf("llm scoring service returned invalid candidate_breakdown payload")
	}

	for i := 1; i <= 6; i++ {
		key := fmt.Sprintf("q%d_text", i)
		if value, ok := rawBreakdown[key].(string); ok && strings.TrimSpace(value) != "" {
			return nil
		}
	}

	return fmt.Errorf("llm scoring service could not map transcript to interview questions")
}

func asFloat64(value interface{}) (float64, bool) {
	switch typed := value.(type) {
	case float64:
		return typed, true
	case float32:
		return float64(typed), true
	case int:
		return float64(typed), true
	case int64:
		return float64(typed), true
	case json.Number:
		parsed, err := typed.Float64()
		if err != nil {
			return 0, false
		}
		return parsed, true
	default:
		return 0, false
	}
}
