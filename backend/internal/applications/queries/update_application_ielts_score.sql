UPDATE applications
SET
    ielts_score = ?,
    updated_at = NOW()
WHERE id = ?;
