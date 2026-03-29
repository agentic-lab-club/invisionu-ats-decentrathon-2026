package messaging

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/rs/zerolog"
)

type StubBus struct {
	logger *zerolog.Logger
}

func NewStubBus(logger *zerolog.Logger) *StubBus {
	return &StubBus{logger: logger}
}

func (b *StubBus) Publish(_ context.Context, routingKey string, payload any) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal event payload: %w", err)
	}

	b.logger.Info().
		Str("event", "message_bus_stub_publish").
		Str("routing_key", routingKey).
		Bytes("payload", body).
		Msg("event published to stub bus")
	return nil
}
