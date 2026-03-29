UPDATE applications
SET
    review_stage = ?,
    decision = COALESCE(?, decision),
    updated_at = NOW()
WHERE id = ?;
