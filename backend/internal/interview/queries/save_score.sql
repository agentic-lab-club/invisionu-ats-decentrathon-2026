UPDATE interview_sessions
SET
    score        = ?,
    status       = ?,
    completed_at = ?,
    updated_at   = NOW()
WHERE id = ?;
