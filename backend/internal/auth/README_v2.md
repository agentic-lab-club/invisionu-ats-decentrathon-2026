# Auth Module

Owns:
- `POST /auth/register`
- `POST /auth/verify-email`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/resend-code`
- `GET /auth/me`

Notes:
- Access token is JWT.
- Refresh token is persisted in `refresh_sessions`.
- Verification code delivery uses `internal/platform/email`.
