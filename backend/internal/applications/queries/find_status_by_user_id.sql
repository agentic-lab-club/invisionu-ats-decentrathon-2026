SELECT
    id AS application_id,
    review_stage,
    decision,
    screening_status,
    screening_error
FROM applications
WHERE user_id = ?
ORDER BY created_at DESC
LIMIT 1;
