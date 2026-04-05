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
		if doc.def.AIProbability <= 0 {
			t.Fatalf("expected ai_probability for %s", doc.def.Email)
		}
		if doc.def.IELTSScore <= 0 {
			t.Fatalf("expected ielts_score for %s", doc.def.Email)
		}
		if doc.def.ENTScore <= 0 {
			t.Fatalf("expected ent_score for %s", doc.def.Email)
		}
		if len(doc.llmResultJSON) == 0 {
			t.Fatalf("expected llm result json for %s", doc.def.Email)
		}
		if doc.transcript == "" {
			t.Fatalf("expected transcript for %s", doc.def.Email)
		}
	}
}

func TestSeededAdminUserDefinition(t *testing.T) {
	if seededAdminUser.Email == "" {
		t.Fatal("expected seeded admin email")
	}
	if seededAdminUser.UserID == "" {
		t.Fatal("expected seeded admin id")
	}
	if seededAdminUser.FirstName == "" || seededAdminUser.LastName == "" {
		t.Fatal("expected seeded admin display name")
	}
	if adminSeedPasswordHash == "" {
		t.Fatal("expected seeded admin password hash")
	}
}
