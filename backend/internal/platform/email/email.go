package email

import "context"

type Sender interface {
	SendVerificationCode(ctx context.Context, recipient string, code string) error
}
