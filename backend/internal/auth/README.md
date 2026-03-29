# Auth API Specification and Documentation

## Purpose and Scope

Owns applicant authentication for `invisionu-ats`: registration, email verification, login, refresh rotation, logout, and current-user lookup.

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

## External Dependencies

- PostgreSQL tables: `users`, `auth_codes`, `refresh_sessions`
- `internal/platform/email` for verification code delivery
- `pkg/auth` for password hashing, JWT generation, refresh rotation, and token hashing

## Config and Env Keys Used

- `environment`
- `auth.jwt_access_secret`
- `auth.jwt_refresh_secret`
- `auth.access_token_ttl_seconds`
- `auth.refresh_token_ttl_seconds`
- `auth.email_verification_code_ttl_seconds`
- `email.mode`
- `email.smtp_host`
- `email.smtp_port`
- `email.smtp_username`
- `email.smtp_password`
- `email.from_email`
- `email.from_name`

## Migrations Added

- `db/migrations/20260329195000_ats_schema.sql`

## Module Tests

```bash
go test ./internal/auth
```
