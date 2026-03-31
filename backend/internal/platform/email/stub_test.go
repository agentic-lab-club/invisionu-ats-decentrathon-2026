package email

import (
	"context"
	"testing"

	"github.com/rs/zerolog"
)

func TestStubSenderReturnsNil(t *testing.T) {
	logger := zerolog.Nop()
	sender := NewStubSender(&logger)
	if err := sender.SendVerificationCode(context.Background(), "user@example.com", "123456"); err != nil {
		t.Fatalf("SendVerificationCode returned error: %v", err)
	}
}
