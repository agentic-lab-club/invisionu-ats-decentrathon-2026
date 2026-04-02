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

func TestLoadApplicantSeedDocuments(t *testing.T) {
	docs, err := loadApplicantSeedDocuments()
	if err != nil {
		t.Fatalf("loadApplicantSeedDocuments returned error: %v", err)
	}
	if len(docs) != 6 {
		t.Fatalf("expected 6 applicant seed documents, got %d", len(docs))
	}
	for _, doc := range docs {
		if doc.def.Email == "" {
			t.Fatal("expected applicant email")
		}
		if len(doc.llmResultJSON) == 0 {
			t.Fatalf("expected llm result json for %s", doc.def.Email)
		}
		if doc.transcript == "" {
			t.Fatalf("expected transcript for %s", doc.def.Email)
		}
	}
}
