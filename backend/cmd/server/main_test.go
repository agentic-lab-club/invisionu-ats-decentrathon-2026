package main

import (
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
