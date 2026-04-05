-- queries/get_full_session_by_id.sql
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
    llm_raw_output,
    error_log,
    created_at,
    updated_at
FROM interview_sessions
WHERE id = ?;