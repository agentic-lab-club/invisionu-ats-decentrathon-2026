UPDATE users
SET
    first_name = ?,
    last_name = ?,
    phone_number = ?,
    updated_at = NOW()
WHERE id = ?;
