SELECT
    id,
    user_id,
    purpose,
    code_hash,
    expires_at,
    consumed_at,
    created_at
FROM auth_codes
WHERE user_id = ?
  AND purpose = ?
  AND consumed_at IS NULL
ORDER BY created_at DESC
LIMIT 1;
