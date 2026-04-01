package programs

import (
	"net/http/httptest"
	"testing"

	pkgAuth "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/auth"
	"github.com/gofiber/fiber/v3"
)

func TestProgramsRequiresAuth(t *testing.T) {
	app := fiber.New()
	manager := pkgAuth.NewTokenManager("secret", 3600)
	Init(app, nil, manager)

	req := httptest.NewRequest("GET", "/api/v1/programs", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test returned error: %v", err)
	}
	if resp.StatusCode != fiber.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", resp.StatusCode)
	}
}
