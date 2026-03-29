SELECT
    id,
    role,
    is_email_verified
FROM users
WHERE id = ?;
