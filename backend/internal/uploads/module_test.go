package uploads

import (
	"net/http/httptest"
	"testing"

	pkgAuth "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/auth"
	"github.com/gofiber/fiber/v3"
)

func TestAssetsRoutesRequireAuth(t *testing.T) {
	app := fiber.New()
	manager := pkgAuth.NewTokenManager("secret", 3600)
	Init(app, nil, manager, nil)

	tests := []struct {
		method string
		path   string
	}{
		{method: "POST", path: "/assets"},
		{method: "GET", path: "/assets/550e8400-e29b-41d4-a716-446655440000"},
	}

	for _, tt := range tests {
		req := httptest.NewRequest(tt.method, tt.path, nil)
		resp, err := app.Test(req)
		if err != nil {
			t.Fatalf("app.Test(%s %s) returned error: %v", tt.method, tt.path, err)
		}
		if resp.StatusCode != fiber.StatusUnauthorized {
			t.Fatalf("expected 401 for %s %s, got %d", tt.method, tt.path, resp.StatusCode)
		}
	}
}
