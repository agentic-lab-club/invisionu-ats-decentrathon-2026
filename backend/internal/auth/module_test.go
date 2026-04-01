package auth

import (
	"net/http/httptest"
	"strings"
	"testing"

	platformEmail "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/internal/platform/email"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/config"
	"github.com/gofiber/fiber/v3"
)

func TestAuthMeRequiresAuth(t *testing.T) {
	app := fiber.New()
	cfg := &config.Config{
		Auth: config.AuthConfig{
			JWTAccessSecret:        "access-secret",
			JWTRefreshSecret:       "refresh-secret",
			AccessTokenTTLSeconds:  3600,
			RefreshTokenTTLSeconds: 7200,
		},
	}
	Init(app, nil, cfg, platformEmail.NewStubSender(nil))

	req := httptest.NewRequest("GET", "/auth/me", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test returned error: %v", err)
	}
	if resp.StatusCode != fiber.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", resp.StatusCode)
	}
}

func TestAuthRegisterRejectsInvalidBodyBeforeService(t *testing.T) {
	app := fiber.New()
	cfg := &config.Config{
		Auth: config.AuthConfig{
			JWTAccessSecret:        "access-secret",
			JWTRefreshSecret:       "refresh-secret",
			AccessTokenTTLSeconds:  3600,
			RefreshTokenTTLSeconds: 7200,
		},
	}
	Init(app, nil, cfg, platformEmail.NewStubSender(nil))

	req := httptest.NewRequest("POST", "/auth/register", strings.NewReader(`{"email":"bad"}`))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test returned error: %v", err)
	}
	if resp.StatusCode != fiber.StatusBadRequest {
		t.Fatalf("expected 400, got %d", resp.StatusCode)
	}
}
