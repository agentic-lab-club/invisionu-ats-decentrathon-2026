SELECT
    a.id AS application_id,
    u.email,
    u.first_name,
    u.last_name,
    u.phone_number,
    p.name AS program_name,
    a.review_stage,
    a.decision,
    a.video_transcript,
    a.screening_error,
    -- These fields are populated by external scoring pipelines.
    -- NULL here; actual values come via scoring_runs (see GetDetail in repository.go).
    NULL::float AS ai_probability,
    NULL::float AS ielts_score,
    NULL::float AS ent_score
FROM applications a
JOIN users u ON u.id = a.user_id
JOIN programs p ON p.id = a.program_id
WHERE a.id = ?;