package logger

import (
	"fmt"
	"strings"
	"time"

	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/timekit"
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
)

type contextKey string

const correlationIDKey contextKey = "correlation_id"

// RequestLoggerMiddleware returns a Fiber middleware for request logging
func RequestLoggerMiddleware() fiber.Handler {
	return func(c fiber.Ctx) error {
		start := timekit.NowUTC()

		correlationID := c.Get("X-Request-ID")
		if correlationID == "" {
			correlationID = uuid.New().String()
		}

		c.Locals(correlationIDKey, correlationID)
		c.Set("X-Request-ID", correlationID)

		clientIPs := c.IPs()
		userAgent := c.Get("User-Agent")

		contentType := c.Get("Content-Type")
		contentLength := c.Get("Content-Length")

		// Проверяем, нужно ли логировать body (исключаем эндпоинты с чувствительными данными)
		shouldLogBody := !isSensitiveEndpoint(c.Path())
		bodyPreview := "<redacted>"
		if shouldLogBody {
			bodyPreview = previewBody(c.BodyRaw(), 512)
		}

		log.Info().
			Str("method", c.Method()).
			Str("event", "http_method_started").
			Str("path_raw", c.OriginalURL()).
			Int("body_size_bytes", len(c.Body())).
			Str("body_preview", bodyPreview).
			Interface("client_ips", clientIPs).
			Str("user_agent", userAgent).
			Str("content_type", contentType).
			Str("content_length", contentLength).
			Str("correlation_id", correlationID). // Нужен для того чтобы понимать что вот эти "логи" от одного и того же запроса
			Msg("HTTP request started")

		logger := log.With().
			Str("correlation_id", correlationID).
			Logger()

		c.Locals("log", &logger)
		err := c.Next()

		duration := time.Since(start)
		status := c.Response().StatusCode()
		if status == 500 {
			logger.
				Error().
				Str("event", "http_method_failed").
				Str("method", c.Method()).
				Str("path_route", c.Route().Path).
				Str("path_raw", c.OriginalURL()).
				Int("status", status).
				Int64("duration", duration.Milliseconds()).
				Int("response_size", len(c.Response().Body())).
				Bytes("response_body", c.Response().Body()).
				Str("correlation_id", correlationID).
				Msg("HTTP request failed")
			return err
		}
		log.Info().
			Str("event", "http_method_finished").
			Str("method", c.Method()).
			Str("path_route", c.Route().Path).
			Str("path_raw", c.OriginalURL()).
			Int("status", status).
			Int64("duration", duration.Milliseconds()).
			Int("response_size", len(c.Response().Body())).
			Bytes("response_body", c.Response().Body()).
			Str("correlation_id", correlationID).
			Msg("HTTP request completed")

		return err
	}
}

func previewBody(b []byte, max int) string {
	if len(b) == 0 {
		return "<empty>"
	}

	preview := b
	if len(preview) > max {
		preview = preview[:max]
	}

	s := strings.TrimSpace(string(preview))

	// Если похоже на бинарные данные — не показываем
	if isBinary(preview) {
		return fmt.Sprintf("<binary %d bytes>", len(b))
	}

	if len(b) > max {
		s += "..."
	}

	return s
}

// isSensitiveEndpoint проверяет, содержит ли эндпоинт чувствительные данные (карты, пароли)
func isSensitiveEndpoint(path string) bool {
	for _, sensitive := range sensitivePaths {
		if strings.Contains(path, sensitive) {
			return true
		}
	}
	return false
}

func isBinary(b []byte) bool {
	for _, c := range b {
		if c < 32 && c != 9 && c != 10 && c != 13 { // не printable ascii
			return true
		}
	}
	return false
}
