INSERT INTO auth_codes (
    user_id,
    purpose,
    code_hash,
    expires_at
)
VALUES (?, ?, ?, ?);
