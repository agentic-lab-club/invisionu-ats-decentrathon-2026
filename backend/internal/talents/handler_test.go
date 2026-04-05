package talents

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gofiber/fiber/v3"
)

type stubTalentService struct {
	listResponse   ListResponse
	statusResponse StatusResponse
	syncResponse   SyncResponse
	err            error
}

func (s *stubTalentService) List(ctx context.Context, params ListParams) (ListResponse, error) {
	return s.listResponse, s.err
}

func (s *stubTalentService) Status(ctx context.Context) (StatusResponse, error) {
	return s.statusResponse, s.err
}

func (s *stubTalentService) Sync(ctx context.Context) (SyncResponse, error) {
	return s.syncResponse, s.err
}

func TestHandlerListReturnsResponse(t *testing.T) {
	app := fiber.New()
	handler := NewHandler(&stubTalentService{
		listResponse: ListResponse{
			Items: []TalentLead{
				{Title: "Lead", Link: "https://example.com", Source: "Daryn.kz"},
			},
			Total:  1,
			Limit:  50,
			Offset: 0,
		},
	})
	app.Get("/talents", handler.List)

	req := httptest.NewRequest(http.MethodGet, "/talents", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test returned error: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d; want %d", resp.StatusCode, http.StatusOK)
	}

	var body ListResponse
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatalf("json decode error = %v", err)
	}
	if body.Total != 1 || len(body.Items) != 1 {
		t.Fatalf("unexpected response: %+v", body)
	}
}

func TestHandlerStatusReturnsResponse(t *testing.T) {
	app := fiber.New()
	now := time.Now().UTC()
	updatedAt := "2026-04-05T12:00:00Z"
	handler := NewHandler(&stubTalentService{
		statusResponse: StatusResponse{
			Backend: BackendStatus{TotalInDB: 7, LastSyncedAt: &now},
			Scraper: ScraperStatus{UpdatedAtUTC: &updatedAt, Total: 7, SourcesScraped: []string{"Daryn.kz"}},
		},
	})
	app.Get("/talents/status", handler.Status)

	req := httptest.NewRequest(http.MethodGet, "/talents/status", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test returned error: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d; want %d", resp.StatusCode, http.StatusOK)
	}

	var body StatusResponse
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatalf("json decode error = %v", err)
	}
	if body.Backend.TotalInDB != 7 || body.Scraper.Total != 7 {
		t.Fatalf("unexpected response: %+v", body)
	}
}

func TestHandlerSyncReturnsResponse(t *testing.T) {
	app := fiber.New()
	handler := NewHandler(&stubTalentService{
		syncResponse: SyncResponse{
			ImportedTotal:       10,
			Inserted:            2,
			Updated:             8,
			SyncedAt:            "2026-04-05T14:23:45Z",
			ScraperUpdatedAtUTC: ptrString("2026-04-05T12:00:00Z"),
		},
	})
	app.Post("/talents/sync", handler.Sync)

	req := httptest.NewRequest(http.MethodPost, "/talents/sync", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test returned error: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d; want %d", resp.StatusCode, http.StatusOK)
	}

	var body SyncResponse
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatalf("json decode error = %v", err)
	}
	if body.ImportedTotal != 10 || body.Inserted != 2 || body.Updated != 8 {
		t.Fatalf("unexpected response: %+v", body)
	}
}

func TestHandlerSyncMapsEmptyCacheToConflict(t *testing.T) {
	app := fiber.New()
	handler := NewHandler(&stubTalentService{err: ErrScraperCacheEmpty})
	app.Post("/talents/sync", handler.Sync)

	req := httptest.NewRequest(http.MethodPost, "/talents/sync", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test returned error: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusConflict {
		t.Fatalf("status = %d; want %d", resp.StatusCode, http.StatusConflict)
	}
}

func TestHandlerStatusMapsUnavailableScraperToBadGateway(t *testing.T) {
	app := fiber.New()
	handler := NewHandler(&stubTalentService{err: errors.Join(ErrScraperUnavailable, errors.New("dial tcp"))})
	app.Get("/talents/status", handler.Status)

	req := httptest.NewRequest(http.MethodGet, "/talents/status", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test returned error: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusBadGateway {
		t.Fatalf("status = %d; want %d", resp.StatusCode, http.StatusBadGateway)
	}
}

func ptrString(value string) *string {
	return &value
}
