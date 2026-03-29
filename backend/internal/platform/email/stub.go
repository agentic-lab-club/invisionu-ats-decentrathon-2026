package email

import (
	"context"

	"github.com/rs/zerolog"
)

type StubSender struct {
	logger *zerolog.Logger
}

func NewStubSender(logger *zerolog.Logger) *StubSender {
	return &StubSender{logger: logger}
}

func (s *StubSender) SendVerificationCode(_ context.Context, recipient string, code string) error {
	s.logger.Info().
		Str("event", "email_verification_code_stubbed").
		Str("recipient", recipient).
		Str("verification_code", code).
		Msg("verification email delivery skipped outside production")
	return nil
}
