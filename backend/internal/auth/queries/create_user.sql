INSERT INTO users (
    email,
    password_hash,
    role,
    is_email_verified
)
VALUES (?, ?, ?, ?)
RETURNING
    id,
    email,
    password_hash,
    role,
    is_email_verified,
    first_name,
    last_name,
    phone_number,
    created_at,
    updated_at;
