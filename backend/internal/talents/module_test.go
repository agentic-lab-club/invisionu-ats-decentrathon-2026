package talents

import (
	"net/http/httptest"
	"testing"

	pkgAuth "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/auth"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/config"
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

var testUUID = uuid.MustParse("550e8400-e29b-41d4-a716-446655440000")

func TestTalentsRoutesRequireAdminRole(t *testing.T) {
	app := fiber.New()
	manager := pkgAuth.NewTokenManager("secret", 3600)
	Init(app, nil, &config.Config{}, manager)

	userToken, _, err := manager.Generate(testUUID, "user", pkgAuth.TokenTypeAccess)
	if err != nil {
		t.Fatalf("Generate returned error: %v", err)
	}

	tests := []struct {
		method string
		path   string
	}{
		{method: "GET", path: "/talents/"},
		{method: "GET", path: "/talents/status"},
		{method: "POST", path: "/talents/sync"},
	}

	for _, tt := range tests {
		req := httptest.NewRequest(tt.method, tt.path, nil)
		req.Header.Set("Authorization", "Bearer "+userToken)
		resp, err := app.Test(req)
		if err != nil {
			t.Fatalf("app.Test(%s %s) returned error: %v", tt.method, tt.path, err)
		}
		if resp.StatusCode != fiber.StatusForbidden {
			t.Fatalf("expected 403 for %s %s, got %d", tt.method, tt.path, resp.StatusCode)
		}
	}
}
