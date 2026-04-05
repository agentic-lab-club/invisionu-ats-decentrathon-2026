UPDATE applications
SET
    screening_status = ?,
    screening_error = ?,
    updated_at = NOW()
WHERE id = ?;
