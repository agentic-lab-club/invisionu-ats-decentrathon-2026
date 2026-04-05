INSERT INTO applications (
    user_id,
    program_id,
    review_stage,
    decision,
    video_file_id,
    screening_status,
    submitted_at
)
VALUES (?, ?, ?, ?, ?, ?, ?)
RETURNING
    id,
    user_id,
    program_id,
    review_stage,
    decision,
    video_file_id,
    video_audio_file_id,
    video_transcript,
    ai_probability,
    ielts_score,
    ent_score,
    screening_status,
    screening_error,
    submitted_at,
    created_at,
    updated_at;
