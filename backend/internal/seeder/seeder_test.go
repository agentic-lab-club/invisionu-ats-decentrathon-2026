package seeder

import "testing"

func TestLoadSeedDocuments(t *testing.T) {
	docs, err := loadSeedDocuments()
	if err != nil {
		t.Fatalf("loadSeedDocuments returned error: %v", err)
	}
	if len(docs.programs.Programs) == 0 {
		t.Fatal("expected seeded programs")
	}
	if docs.personality.Code == "" {
		t.Fatal("expected personality test code")
	}
	if len(docs.personality.Questions) < 10 {
		t.Fatalf("expected personality test questions, got %d", len(docs.personality.Questions))
	}
}
