package messaging

import (
	"context"
	"testing"

	"github.com/rs/zerolog"
)

func TestStubBusPublishReturnsNil(t *testing.T) {
	logger := zerolog.Nop()
	bus := NewStubBus(&logger)
	if err := bus.Publish(context.Background(), "application.submitted", map[string]string{"id": "1"}); err != nil {
		t.Fatalf("Publish returned error: %v", err)
	}
}
