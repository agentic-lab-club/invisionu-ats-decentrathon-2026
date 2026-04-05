UPDATE interview_sessions
SET
    answers    = COALESCE(answers, '[]'::jsonb) || to_jsonb(?::text),
    updated_at = NOW()
WHERE id = ?;
