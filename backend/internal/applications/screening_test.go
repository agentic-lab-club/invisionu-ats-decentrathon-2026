package applications

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strings"
	"testing"
	"time"
)

func TestSTTClientTranscribe(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Fatalf("expected POST, got %s", r.Method)
		}
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, `{"text":"hello world"}`)
	}))
	defer server.Close()

	client := NewSTTClient(server.URL, &http.Client{Timeout: time.Second})
	text, err := client.Transcribe(context.Background(), "https://signed.example/audio.mp3")
	if err != nil {
		t.Fatalf("Transcribe returned error: %v", err)
	}
	if text != "hello world" {
		t.Fatalf("expected transcription text to be returned, got %q", text)
	}
}

func TestLLMScoringClientAnalyze(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Fatalf("expected POST, got %s", r.Method)
		}
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, `{"workflow_status":"success","global_score":{"LeadershipIndex":3.4}}`)
	}))
	defer server.Close()

	client := NewLLMScoringClient(server.URL, &http.Client{Timeout: time.Second})
	result, err := client.Analyze(context.Background(), "candidate transcript")
	if err != nil {
		t.Fatalf("Analyze returned error: %v", err)
	}
	if result["workflow_status"] != "success" {
		t.Fatalf("expected workflow_status=success, got %#v", result["workflow_status"])
	}
}

func TestTruncateForDB(t *testing.T) {
	input := strings.Repeat("a", 2100)
	output := truncateForDB(input)
	if len(output) != 2000 {
		t.Fatalf("expected truncated length 2000, got %d", len(output))
	}
}

func TestFileRecordIncludesCreatedAtDBField(t *testing.T) {
	fileRecordType := reflect.TypeOf(FileRecord{})
	for i := 0; i < fileRecordType.NumField(); i++ {
		field := fileRecordType.Field(i)
		if field.Tag.Get("db") == "created_at" {
			return
		}
	}

	t.Fatal("expected FileRecord to include db:\"created_at\" for INSERT ... RETURNING scans")
}

func TestValidateLLMScoringResultRejectsEmptyCandidateBreakdown(t *testing.T) {
	result := JSONMap{
		"workflow_status": "success",
		"candidate_breakdown": map[string]interface{}{
			"q1_text": "",
			"q2_text": "   ",
			"q3_text": "",
			"q4_text": "",
			"q5_text": "",
			"q6_text": "",
		},
	}

	err := validateLLMScoringResult(result)
	if err == nil {
		t.Fatal("expected validation to fail when llm scoring cannot map transcript to interview questions")
	}
}

func TestValidateLLMScoringResultAcceptsMappedCandidateBreakdown(t *testing.T) {
	result := JSONMap{
		"workflow_status": "success",
		"candidate_breakdown": map[string]interface{}{
			"q1_text": "I want to apply because...",
			"q2_text": "",
			"q3_text": "",
			"q4_text": "",
			"q5_text": "",
			"q6_text": "",
		},
	}

	if err := validateLLMScoringResult(result); err != nil {
		t.Fatalf("expected validation to pass, got error: %v", err)
	}
}
