# Platform Email Module Contract

## Purpose

Provide the email delivery abstraction used by the auth module for verification codes.

## Responsibilities

- Define the `Sender` interface consumed by business code.
- Provide an SMTP-backed sender.
- Provide a stub sender for local/non-production flows.

## Out Of Scope

- Email templates beyond the current hardcoded verification message.
- Retry queues or async delivery.
- Inbound email handling.
- General-purpose mail API beyond verification codes.

## Domain Concepts / Entities

### `Sender`

Interface:

```go
SendVerificationCode(ctx context.Context, recipient string, code string) error
```

### `SMTPSender`

- sends a plain-text verification email through `net/smtp`
- builds sender address from config

### `StubSender`

- does not deliver email
- logs recipient and verification code through Zerolog

## Endpoint Overview

- No HTTP endpoints.

## Auth / Roles

- Not applicable.

## Request / Response Conventions

- Callers invoke `SendVerificationCode`.
- On success, sender returns `nil`.
- On failure, sender returns wrapped error.

## Business Flows

Runtime selection happens in `cmd/server/main.go`:

- if `email.enabled == true`
- and environment is `production`
- and `email.mode == smtp`

then backend wires `SMTPSender`; otherwise it wires `StubSender`.

SMTP flow:
1. Build SMTP address from host/port.
2. Build plain-text email body.
3. Call `smtp.SendMail`.

Stub flow:
1. Log the verification code.
2. Return success.

## Validation Rules

- This module does not validate recipient format itself.
- SMTP config completeness is assumed by `NewSMTPSender`.

## Lifecycle / State Transitions

- No persistent lifecycle; adapters are stateless after construction.

## Error Handling

- SMTP sender wraps send failures as `failed to send verification email: ...`
- Stub sender always returns `nil`

## Security Notes

- Stub sender logs the plaintext verification code; do not use it for production email delivery.
- SMTP sender uses `smtp.PlainAuth` with provided config.
- Context is accepted by the interface but not actively used by the SMTP implementation.

## Frontend Integration Notes

- Frontend interacts with this module indirectly through the auth module.
- In local/stub mode, the verification code is available in backend logs rather than an actual inbox.

## Known Limitations / TODO

- No HTML templates.
- No retry/backoff.
- No provider abstraction beyond SMTP vs stub.
- No TLS/transport tuning beyond `net/smtp` defaults.

## Related Files / Modules

- `internal/platform/email/email.go`
- `internal/platform/email/smtp.go`
- `internal/platform/email/stub.go`
- `internal/auth`
- `cmd/server/main.go`
