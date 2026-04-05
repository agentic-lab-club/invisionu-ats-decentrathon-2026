package applications

import (
	"net/http/httptest"
	"strings"
	"testing"

	platformMessaging "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/internal/platform/messaging"
	pkgAuth "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/auth"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/config"
	"github.com/gofiber/fiber/v3"
)

func TestApplicationsRoutesRequireUserAuth(t *testing.T) {
	app := fiber.New()
	cfg := &config.Config{}
	manager := pkgAuth.NewTokenManager("secret", 3600)
	Init(app, nil, cfg, manager, platformMessaging.NewStubBus(nil), nil)

	tests := []struct {
		method string
		path   string
		body   string
	}{
		{method: "GET", path: "/applications/status"},
		{method: "POST", path: "/applications/", body: `{"program_code":"x"}`},
	}

	for _, tt := range tests {
		req := httptest.NewRequest(tt.method, tt.path, strings.NewReader(tt.body))
		if tt.body != "" {
			req.Header.Set("Content-Type", "application/json")
		}
		resp, err := app.Test(req)
		if err != nil {
			t.Fatalf("app.Test(%s %s) returned error: %v", tt.method, tt.path, err)
		}
		if resp.StatusCode != fiber.StatusUnauthorized {
			t.Fatalf("expected 401 for %s %s, got %d", tt.method, tt.path, resp.StatusCode)
		}
	}
}
