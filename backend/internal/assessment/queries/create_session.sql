INSERT INTO assessment_sessions (
    user_id,
    specialization,
    expires_at,
    questions,
    status
)
VALUES (?, ?, ?, ?, ?)
RETURNING
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
    error_log;
