INSERT INTO refresh_sessions (
    user_id,
    token_hash,
    expires_at,
    user_agent,
    ip_address
)
VALUES (?, ?, ?, ?, ?);
