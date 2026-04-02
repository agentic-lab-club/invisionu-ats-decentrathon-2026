UPDATE assessment_sessions
SET answers = ?,
    status = ?,
    started_at = ?
WHERE id = ?;
