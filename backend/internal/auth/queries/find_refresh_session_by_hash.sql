SELECT
    rs.id,
    rs.user_id,
    rs.token_hash,
    rs.expires_at,
    rs.revoked_at,
    rs.user_agent,
    rs.ip_address,
    rs.created_at,
    rs.updated_at,
    u.email AS user_email,
    u.role AS user_role,
    u.is_email_verified AS user_is_email_verified,
    u.first_name AS user_first_name,
    u.last_name AS user_last_name,
    u.phone_number AS user_phone_number
FROM refresh_sessions rs
JOIN users u ON u.id = rs.user_id
WHERE rs.token_hash = ?;
