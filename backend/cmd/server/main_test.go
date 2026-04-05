package main

import (
	"encoding/json"
	"testing"

	platformEmail "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/internal/platform/email"
	platformMessaging "github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/internal/platform/messaging"
	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/config"
)

func TestBuildEmailSenderUsesStubWhenSMTPDisabled(t *testing.T) {
	cfg := &config.Config{
		Environment: "production",
		Email: config.EmailConfig{
			Enabled: false,
			Mode:    "smtp",
		},
	}

	sender := buildEmailSender(cfg)

	if _, ok := sender.(*platformEmail.StubSender); !ok {
		t.Fatalf("expected stub sender when smtp is disabled, got %T", sender)
	}
}

func TestBuildMessageBusUsesStubWhenLLMDisabled(t *testing.T) {
	cfg := &config.Config{
		Messaging: config.MessagingConfig{
			Enabled: true,
			Mode:    "rabbitmq",
		},
		LLM: config.LLMConfig{
			Enabled: false,
		},
	}

	bus, err := buildMessageBus(cfg)
	if err != nil {
		t.Fatalf("buildMessageBus returned error: %v", err)
	}

	if _, ok := bus.(*platformMessaging.StubBus); !ok {
		t.Fatalf("expected stub bus when llm integration is disabled, got %T", bus)
	}
}

func TestRewriteSwaggerSpecOverridesHostAndScheme(t *testing.T) {
	input := []byte(`{"swagger":"2.0","host":"localhost:8080","schemes":["http","https"]}`)

	output, err := rewriteSwaggerSpec(input, "127.0.0.1:8080", "http")
	if err != nil {
		t.Fatalf("rewriteSwaggerSpec returned error: %v", err)
	}

	var doc map[string]any
	if err := json.Unmarshal(output, &doc); err != nil {
		t.Fatalf("failed to unmarshal rewritten spec: %v", err)
	}

	if got := doc["host"]; got != "127.0.0.1:8080" {
		t.Fatalf("expected host to be overridden, got %v", got)
	}

	schemes, ok := doc["schemes"].([]any)
	if !ok || len(schemes) != 1 || schemes[0] != "http" {
		t.Fatalf("expected schemes to be [http], got %#v", doc["schemes"])
	}
}

func TestNormalizeScheme(t *testing.T) {
	tests := map[string]string{
		"http":     "http",
		"https":    "https",
		"HTTP/1.1": "http",
		"ws":       "http",
		"wss":      "https",
		"":         "http",
	}

	for input, expected := range tests {
		if got := normalizeScheme(input); got != expected {
			t.Fatalf("normalizeScheme(%q) = %q, want %q", input, got, expected)
		}
	}
}
