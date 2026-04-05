-- get_full_session_by_application_id.sql
-- Finds the most recent interview session for a candidate, given their application_id.
-- Path: applications.id -> users.id -> interview_sessions.user_id
SELECT
    s.id,
    s.user_id,
    s.status,
    s.questions,
    s.answers,
    s.score,
    s.expires_at,
    s.started_at,
    s.completed_at,
    s.llm_raw_output,
    s.error_log,
    s.created_at,
    s.updated_at
FROM interview_sessions s
JOIN applications a ON a.user_id = s.user_id
WHERE a.id = ?
ORDER BY s.created_at DESC
LIMIT 1;