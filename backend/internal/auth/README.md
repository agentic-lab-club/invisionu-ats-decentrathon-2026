# Auth API Specification and Documentation

## Purpose and Scope

Owns applicant authentication for the ATS backend: registration, email verification, login, refresh rotation, logout, resend-code, and current-user lookup.

## Business Rules

- New users are created with role `user`.
- Login is allowed only after email verification.
- `login` and `refresh` return both token pair and current user role.
- Refresh rotates the previous refresh session.
- Email delivery is stubbed when `email.enabled=false` or environment is not production.

## Swagger Tag

- `@auth`

## Owned Routes

- `POST /auth/register`
- `POST /auth/verify-email`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/resend-code`
- `GET /auth/me`

## Auth Requirements

- Public: register, verify-email, login, refresh, logout, resend-code
- Bearer token required: `GET /auth/me`

## Request and Response Examples

`POST /auth/login`

- request:
  `{"email":"user@example.com","password":"StrongPass123!"}`
- success:
  `{"access_token":"...","refresh_token":"...","token_type":"Bearer","expires_in_seconds":3600,"user":{"id":"uuid","email":"user@example.com","role":"user","is_email_verified":true}}`

`POST /auth/refresh`

- request:
  `{"refresh_token":"..."}`

## Error Cases

- `400`: invalid payload, user already exists, verification errors, resend errors
- `401`: invalid credentials, invalid access token, invalid refresh token
- `404`: user not found in `me`

## External Dependencies

- PostgreSQL tables: `users`, `auth_codes`, `refresh_sessions`
- `internal/platform/email` for verification delivery
- `pkg/auth` for password hashing and JWT token management

## Config and Env Keys Used

- `environment`
- `auth.jwt_access_secret`
- `auth.jwt_refresh_secret`
- `auth.access_token_ttl_seconds`
- `auth.refresh_token_ttl_seconds`
- `auth.email_verification_code_ttl_seconds`
- `email.enabled`
- `email.mode`
- `email.smtp_host`
- `email.smtp_port`
- `email.smtp_user`
- `email.smtp_pass`
- `email.from_email`
- `email.from_name`

## Migrations Added

- `db/migrations/20260329195000_ats_schema.sql`

## Module Tests

```bash
go test ./internal/auth
```
