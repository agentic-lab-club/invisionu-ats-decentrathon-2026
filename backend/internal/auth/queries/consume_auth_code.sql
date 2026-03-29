UPDATE auth_codes
SET consumed_at = NOW()
WHERE id = ?;
