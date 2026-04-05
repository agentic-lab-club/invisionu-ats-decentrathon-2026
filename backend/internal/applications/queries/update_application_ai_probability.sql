UPDATE applications
SET
    ai_probability = ?,
    updated_at = NOW()
WHERE id = ?;
