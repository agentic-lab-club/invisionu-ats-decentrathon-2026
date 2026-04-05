UPDATE applications
SET
    ent_score = ?,
    updated_at = NOW()
WHERE id = ?;
