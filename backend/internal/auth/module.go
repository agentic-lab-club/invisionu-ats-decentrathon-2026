package auth

import (
	platformEmail "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/internal/platform/email"
	pkgAuth "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/auth"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/config"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/database"
	md "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/http/middlewares"
	"github.com/gofiber/fiber/v3"
)

func Init(server *fiber.App, db *database.TrackedDB, cfg *config.Config, sender platformEmail.Sender) *pkgAuth.TokenManager {
	repo := NewRepository(db)
	accessManager := pkgAuth.NewTokenManager(cfg.Auth.JWTAccessSecret, cfg.Auth.AccessTokenTTLSeconds)
	refreshManager := pkgAuth.NewTokenManager(cfg.Auth.JWTRefreshSecret, cfg.Auth.RefreshTokenTTLSeconds)
	service := NewService(repo, cfg, accessManager, refreshManager, sender)
	handler := NewHandler(service)

	api := server.Group("/auth")
	api.Post("/register", md.BindAndValidate[RegisterRequest](), handler.Register)
	api.Post("/verify-email", md.BindAndValidate[VerifyEmailRequest](), handler.VerifyEmail)
	api.Post("/login", md.BindAndValidate[LoginRequest](), handler.Login)
	api.Post("/refresh", md.BindAndValidate[RefreshRequest](), handler.Refresh)
	api.Post("/logout", md.BindAndValidate[LogoutRequest](), handler.Logout)
	api.Post("/resend-code", md.BindAndValidate[ResendCodeRequest](), handler.ResendCode)
	api.Get("/me", md.AuthRole(accessManager, RoleUser, RoleAdmin), handler.Me)

	return accessManager
}
