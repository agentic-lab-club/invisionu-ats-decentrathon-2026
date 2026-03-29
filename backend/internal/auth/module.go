package auth

import (
	"time"

	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/config"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/database"
	md "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/http/middlewares"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/telegram"
	"github.com/gofiber/fiber/v3"
)

func Init(server *fiber.App, db *database.TrackedDB, cfg *config.Config, tgBot *telegram.Bot) {
	RegisterRoutes(server, db, cfg, tgBot)

	// Start cleanup goroutine
	go startCleanupRoutine(db, cfg, tgBot)
}

func RegisterRoutes(server *fiber.App, db *database.TrackedDB, cfg *config.Config, tgBot *telegram.Bot) {
	repo := NewRepository(db)
	service := NewService(repo, cfg, tgBot)
	handler := NewHandler(service)

	// API group with token protection
	api := server.Group("/auth-otp")
	// Apply rate limiting middleware
	api.Use(handler.RateLimitMiddleware())

	// Routes
	api.Post("/request", md.BindAndValidate[OTPRequest](), handler.RequestOTP)    // Supports optional channel param
	api.Post("/request-v2", md.BindAndValidate[OTPRequest](), handler.RequestOTP) // Same as /request (for backwards compatibility)
	api.Post("/request-admin", md.AuthRole(cfg, db, md.RoleAdmin), md.BindAndValidate[OTPRequest](), handler.RequestOTPAdmin)
	api.Post("/login", md.BindAndValidate[OTPLoginRequest](), handler.VerifyOTP)
	api.Get("/health", handler.Health)
}

func startCleanupRoutine(db *database.TrackedDB, cfg *config.Config, tgBot *telegram.Bot) {
	repo := NewRepository(db)
	service := NewService(repo, cfg, tgBot)

	ticker := time.NewTicker(10 * time.Minute) // Cleanup every 10 minutes
	defer ticker.Stop()

	for range ticker.C {
		_ = service.CleanupExpired()
	}
}
