package email

import (
	"context"
	"fmt"
	"net/smtp"

	"github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/backend/pkg/config"
)

type SMTPSender struct {
	addr string
	auth smtp.Auth
	from string
	name string
}

func NewSMTPSender(cfg config.EmailConfig) *SMTPSender {
	addr := fmt.Sprintf("%s:%d", cfg.SMTPHost, cfg.SMTPPort)
	return &SMTPSender{
		addr: addr,
		auth: smtp.PlainAuth("", cfg.SMTPUser, cfg.SMTPPass, cfg.SMTPHost),
		from: cfg.FromEmail,
		name: cfg.FromName,
	}
}

func (s *SMTPSender) SendVerificationCode(_ context.Context, recipient string, code string) error {
	body := fmt.Sprintf("From: %s <%s>\r\nSubject: InVisionU verification code\r\n\r\nYour verification code is: %s\r\n", s.name, s.from, code)
	if err := smtp.SendMail(s.addr, s.auth, s.from, []string{recipient}, []byte(body)); err != nil {
		return fmt.Errorf("failed to send verification email: %w", err)
	}
	return nil
}
