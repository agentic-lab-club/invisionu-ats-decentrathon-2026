# Platform Email Adapter Documentation

## Purpose and Scope

Provides the email delivery abstraction used by the auth module for verification codes.

## Business Rules

- `Sender` is the only interface consumed by business modules.
- When email delivery is disabled or environment is non-production, backend must use the stub sender.
- SMTP sender is used only when explicitly enabled for production.

## Public Interface

- `SendVerificationCode(ctx, recipient, code) error`

## Config and Env Keys Used

- `email.enabled`
- `email.mode`
- `email.from_name`
- `email.from_email`
- `email.smtp_host`
- `email.smtp_port`
- `email.smtp_user`
- `email.smtp_pass`

## Module Tests

```bash
go test ./internal/platform/email
```
