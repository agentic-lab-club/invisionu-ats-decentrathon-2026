SELECT
    id,
    user_id,
    specialization,
    created_at,
    expires_at,
    started_at,
    completed_at,
    questions,
    answers,
    evaluation,
    overall_score,
    leadership_score,
    status,
    llm_raw_output,
    error_log
FROM assessment_sessions
WHERE id = ?;
