package md

import (
	"sync"
	"time"

	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/logger"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/metrics"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/timekit"
	"github.com/gofiber/fiber/v3"
)

// RateLimiterConfig holds rate limiter configuration
type RateLimiterConfig struct {
	Max        int
	Expiration time.Duration
	Message    string
	SkipPaths  []string
}

func DefaultRateLimiterConfig() RateLimiterConfig {
	return RateLimiterConfig{
		Max:        100,
		Expiration: 1 * time.Minute,
		Message:    "Too many requests. Please try again later.",
		SkipPaths:  []string{"/metrics", "/health"},
	}
}

type visitor struct {
	count     int
	expiresAt time.Time
}

type RateLimiter struct {
	visitors map[string]*visitor
	mu       sync.RWMutex
	config   RateLimiterConfig
}

func NewRateLimiter(cfg RateLimiterConfig) *RateLimiter {
	rl := &RateLimiter{
		visitors: make(map[string]*visitor),
		config:   cfg,
	}

	go rl.cleanup()

	return rl
}

func (rl *RateLimiter) cleanup() {
	for {
		time.Sleep(rl.config.Expiration)
		rl.mu.Lock()
		now := timekit.NowUTC()
		for ip, v := range rl.visitors {
			if now.After(v.expiresAt) {
				delete(rl.visitors, ip)
			}
		}
		rl.mu.Unlock()
	}
}

func (rl *RateLimiter) isAllowed(ip string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := timekit.NowUTC()
	v, exists := rl.visitors[ip]

	if !exists || now.After(v.expiresAt) {
		rl.visitors[ip] = &visitor{count: 1, expiresAt: now.Add(rl.config.Expiration)}
		return true
	}

	if v.count >= rl.config.Max {
		return false
	}

	v.count++
	return true
}

func (rl *RateLimiter) shouldSkip(path string) bool {
	for _, skipPath := range rl.config.SkipPaths {
		if path == skipPath {
			return true
		}
	}
	return false
}

func (rl *RateLimiter) Middleware() fiber.Handler {
	return func(c fiber.Ctx) error {
		if rl.shouldSkip(c.Path()) {
			return c.Next()
		}

		ip := c.IP()
		if !rl.isAllowed(ip) {
			metrics.RecordRateLimitHit(c.Route().Path, ip)

			correlationID, _ := c.Locals("correlation_id").(string)
			logger.Logger.Warn().
				Str("correlation_id", correlationID).
				Str("ip", ip).
				Str("path", c.Path()).
				Msg("Rate limit exceeded")

			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error":          rl.config.Message,
				"code":           "ErrCodeRateLimit",
				"correlation_id": correlationID,
				"retry_after":    rl.config.Expiration.Seconds(),
			})
		}

		return c.Next()
	}
}

func RateLimiterMiddleware() fiber.Handler {
	limiter := NewRateLimiter(DefaultRateLimiterConfig())
	return limiter.Middleware()
}

func AuthRateLimiterMiddleware() fiber.Handler {
	limiter := NewRateLimiter(RateLimiterConfig{
		Max:        5,
		Expiration: 15 * time.Minute,
		Message:    "Too many authentication attempts. Please try again in 15 minutes.",
		SkipPaths:  []string{},
	})
	return limiter.Middleware()
}

func APIRateLimiterMiddleware(maxRequests int, window time.Duration) fiber.Handler {
	limiter := NewRateLimiter(RateLimiterConfig{
		Max:        maxRequests,
		Expiration: window,
		Message:    "API rate limit exceeded. Please slow down.",
		SkipPaths:  []string{"/metrics", "/health", "/health/liveness", "/health/readiness"},
	})
	return limiter.Middleware()
}
