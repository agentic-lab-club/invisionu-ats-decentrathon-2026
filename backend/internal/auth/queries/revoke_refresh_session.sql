UPDATE refresh_sessions
SET
    revoked_at = NOW(),
    updated_at = NOW()
WHERE id = ?;
