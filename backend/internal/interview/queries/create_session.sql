INSERT INTO interview_sessions (
    user_id,
    status,
    questions,
    answers,
    expires_at
)
VALUES (?, ?, ?, ?, ?)
RETURNING
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
    updated_at;
