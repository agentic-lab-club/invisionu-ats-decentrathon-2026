# Auth Module Contract

## Purpose

Own user registration, email verification, login, refresh rotation, logout, resend-code, and current-user lookup.

This module is the source of truth for:
- applicant/admin bearer token issuance
- email verification gating before login when email verification is enabled
- role delivery to frontend via `login`, `refresh`, and `me`

## Responsibilities

- Create new users with role `user`.
- Issue and verify email verification codes.
- Hash passwords and compare login credentials through `pkg/auth`.
- Issue access and refresh JWTs.
- Persist refresh sessions and rotate them on refresh.
- Expose the authenticated user profile for bearer sessions.

## Out Of Scope

- Password reset or password change.
- Social login / SSO.
- Admin user management.
- Session listing / session revocation by device.
- Email transport selection; that is wired in `cmd/server/main.go`.

## Domain Concepts / Entities

### `User`

Fields exposed to callers:
- `id`
- `email`
- `role`
- `is_email_verified`
- optional `first_name`, `last_name`, `phone_number`

### `AuthCode`

Email verification code record:
- stored as `code_hash`, not plaintext
- purpose currently used here: `email_verification`
- considered invalid if consumed or expired

### `RefreshSession`

Refresh token session:
- stores only `token_hash`
- can become revoked
- includes optional `user_agent` and `ip_address`

## Endpoint Overview

### `POST /auth/register`

Create a new user. When email verification is enabled, the user is created unverified and a verification code is issued. When `email.enabled = false`, the user is created already verified and no code is sent.

Request example:

```json
{
  "email": "user@example.com",
  "password": "StrongPass123"
}
```

Success:

```json
{
  "message": "Verification code sent",
  "requires_email_verification": true
}
```

When `email.enabled = false`:

```json
{
  "message": "Account created",
  "requires_email_verification": false
}
```

### `POST /auth/verify-email`

Verify the latest active email verification code.

This endpoint returns `email verification is disabled` when `email.enabled = false`.

Request example:

```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

### `POST /auth/login`

Authenticate a verified user.
When email verification is disabled, the login flow does not require `is_email_verified = true`.

Success example:

```json
{
  "access_token": "...",
  "refresh_token": "...",
  "token_type": "Bearer",
  "expires_in_seconds": 3600,
  "user": {
    "id": "11111111-1111-1111-1111-111111111111",
    "email": "user@example.com",
    "role": "user",
    "is_email_verified": true
  }
}
```

### `POST /auth/refresh`

Rotate a refresh session and return a new token pair.

Request:

```json
{
  "refresh_token": "..."
}
```

Response shape matches `POST /auth/login`.

### `POST /auth/logout`

Revoke the provided refresh token session if it exists.

### `POST /auth/resend-code`

Issue a new verification code for an existing unverified user.
This endpoint returns `email verification is disabled` when `email.enabled = false`.

### `GET /auth/me`

Return the current authenticated user from bearer access token context.

Success example:

```json
{
  "user": {
    "id": "11111111-1111-1111-1111-111111111111",
    "email": "user@example.com",
    "role": "user",
    "is_email_verified": true
  }
}
```

## Auth / Roles

- Public endpoints:
  - `POST /auth/register`
  - `POST /auth/verify-email`
  - `POST /auth/login`
  - `POST /auth/refresh`
  - `POST /auth/logout`
  - `POST /auth/resend-code`
- Bearer token required:
  - `GET /auth/me`
- `GET /auth/me` accepts roles `user` and `admin`

## Request / Response Conventions

- Request body binding and validation are handled by shared middleware.
- `login` and `refresh` return the same `TokenResponse` shape.
- Role is nested under `user.role`, not returned as a top-level field.
- Success responses use shared responder helpers; error body shape is shared platform behavior.

## Business Flows

### Registration flow

1. Normalize email to lower-case trimmed value.
2. Apply in-memory rate limit: 3 registration attempts per 60 seconds per email.
3. Reject if user already exists.
4. Hash password and create user with role `user`.
5. If `email.enabled = false`, store the user as already verified and stop.
6. Otherwise generate a 6-digit verification code.
7. Store only the hashed verification code.
8. Send the plaintext code via configured `email.Sender`.

### Email verification flow

1. Normalize email.
2. Apply in-memory rate limit: 5 verification attempts per 300 seconds per email.
3. Load user and latest active verification code.
4. Reject if missing, consumed, expired, or hash mismatch.
5. Mark code consumed.
6. Mark user email as verified.

### Login / refresh flow

1. `login` checks credentials and requires `is_email_verified = true` only when email verification is enabled.
2. `refresh` looks up refresh session by token hash.
3. Refresh revokes the current session before issuing a new one.
4. Both flows create a fresh refresh session and return access + refresh tokens.

## Validation Rules

Request validation visible in code:
- `RegisterRequest`
  - `email`: required, valid email
  - `password`: required, min `8`, max `72`
- `VerifyEmailRequest`
  - `email`: required, valid email
  - `code`: required, exact length `6`
- `LoginRequest`
  - `email`: required, valid email
  - `password`: required, min `8`, max `72`
- `RefreshRequest`
  - `refresh_token`: required
- `LogoutRequest`
  - `refresh_token`: required
- `ResendCodeRequest`
  - `email`: required, valid email

Additional service rules:
- login blocked until email is verified
- user email is normalized before lookup

## Lifecycle / State Transitions

### User lifecycle

1. `created / unverified`
2. `email verified`
3. `authenticated via access + refresh tokens`

### Refresh session lifecycle

1. `created`
2. `active`
3. `revoked` on refresh or logout
4. `expired` by time

## Error Handling

Handler status mapping:
- `400 Bad Request`
  - register
  - verify-email
  - logout
  - resend-code
  - invalid JSON / validation failures before service
- `401 Unauthorized`
  - login failure
  - refresh failure
  - missing/invalid bearer token on `me`
- `404 Not Found`
  - `me` when auth context exists but user row no longer exists

Representative service errors:
- `user already exists`
- `register rate limit exceeded`
- `verification rate limit exceeded`
- `verification code not found`
- `verification code expired`
- `invalid verification code`
- `invalid credentials`
- `email is not verified`
- `invalid refresh token`
- `refresh token expired`

## Security Notes

- Passwords are hashed through `pkg/auth`.
- Verification codes are stored hashed, not plaintext.
- Refresh tokens are stored hashed, not plaintext.
- Email normalization reduces duplicate-account mismatch by case/whitespace.
- Stub email sender logs the verification code; this is acceptable only for non-production/local workflows.

## Frontend Integration Notes

- Frontend should use `user.role` from `login`, `refresh`, or `me` for routing and role-specific UI.
- `register` and `resend-code` return the same success message.
- `logout` is refresh-token based and does not require an access token.
- `401` from `refresh` means the stored refresh token is no longer usable; frontend should force a fresh login.

## Known Limitations / TODO

- Rate limiting is in-memory and process-local, not distributed.
- `resend-code` has no dedicated rate limiter in this module.
- No password reset flow.
- No account lockout / brute-force protection beyond current lightweight rate limits.
- No refresh-session inventory endpoint.

## Related Files / Modules

- `internal/auth/module.go`
- `internal/auth/handler.go`
- `internal/auth/service.go`
- `internal/auth/repository.go`
- `internal/auth/domain.go`
- `internal/auth/queries.go`
- `internal/platform/email`
- `pkg/auth`
- `pkg/http/middlewares`
