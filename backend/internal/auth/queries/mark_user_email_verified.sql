UPDATE users
SET
    is_email_verified = TRUE,
    updated_at = NOW()
WHERE id = ?;
