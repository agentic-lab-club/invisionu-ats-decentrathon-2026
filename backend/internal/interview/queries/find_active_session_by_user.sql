SELECT
    id,
    user_id,
    status,
    questions,
    answers,
    score,
    expires_at,
    started_at,
    completed_at,
    created_at,
    updated_at
FROM interview_sessions
WHERE user_id = ?
  AND status IN ('pending', 'active')
ORDER BY created_at DESC
LIMIT 1;
