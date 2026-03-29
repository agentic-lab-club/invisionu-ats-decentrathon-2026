INSERT INTO applications (
    user_id,
    program_id,
    review_stage,
    decision,
    video_file_id,
    submitted_at
)
VALUES (?, ?, ?, ?, ?, ?)
RETURNING
    id,
    user_id,
    program_id,
    review_stage,
    decision,
    video_file_id,
    screening_error,
    submitted_at,
    created_at,
    updated_at;
