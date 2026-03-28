package md

import (
	"context"
	"time"

	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/logger"
	"github.com/gofiber/fiber/v3"
)

// TimeoutConfig holds request timeout configuration
type TimeoutConfig struct {
	// Timeout duration for requests
	Timeout time.Duration

	// ErrorMessage to return when timeout occurs
	ErrorMessage string

	// SkipPaths to exclude from timeout
	SkipPaths []string
}

// DefaultTimeoutConfig returns default timeout configuration
func DefaultTimeoutConfig() TimeoutConfig {
	return TimeoutConfig{
		Timeout:      30 * time.Second,
		ErrorMessage: "Request timeout exceeded",
		SkipPaths:    []string{"/metrics", "/health"},
	}
}

// Timeout returns a middleware that enforces request timeouts
func Timeout(cfg ...TimeoutConfig) fiber.Handler {
	config := DefaultTimeoutConfig()
	if len(cfg) > 0 {
		config = cfg[0]
	}

	return func(c fiber.Ctx) error {
		// Skip certain paths
		for _, path := range config.SkipPaths {
			if c.Path() == path {
				return c.Next()
			}
		}

		// Create context with timeout
		ctx, cancel := context.WithTimeout(c.Context(), config.Timeout)
		defer cancel()

		// Store context in locals for downstream use
		c.Locals("ctx", ctx)

		// Channel to capture handler completion
		done := make(chan error, 1)

		go func() {
			done <- c.Next()
		}()

		select {
		case err := <-done:
			return err
		case <-ctx.Done():
			correlationID, _ := c.Locals("correlation_id").(string)
			logger.Logger.Warn().
				Str("correlation_id", correlationID).
				Str("path", c.Path()).
				Str("method", c.Method()).
				Dur("timeout", config.Timeout).
				Msg("Request timeout exceeded")

			return c.Status(fiber.StatusRequestTimeout).JSON(fiber.Map{
				"error":          config.ErrorMessage,
				"code":           "REQUEST_TIMEOUT",
				"correlation_id": correlationID,
			})
		}
	}
}

// RequestTimeoutMiddleware returns the default timeout middleware
func RequestTimeoutMiddleware() fiber.Handler {
	return Timeout()
}

// LongRunningTimeoutMiddleware returns timeout for long-running operations
func LongRunningTimeoutMiddleware() fiber.Handler {
	return Timeout(TimeoutConfig{
		Timeout:      5 * time.Minute,
		ErrorMessage: "Operation timeout exceeded",
		SkipPaths:    []string{"/metrics", "/health"},
	})
}
