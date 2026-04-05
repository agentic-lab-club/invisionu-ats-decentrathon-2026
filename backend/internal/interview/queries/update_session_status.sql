UPDATE interview_sessions
SET
    status     = ?,
    started_at = CASE WHEN ? THEN NOW() ELSE started_at END,
    updated_at = NOW()
WHERE id = ?;
