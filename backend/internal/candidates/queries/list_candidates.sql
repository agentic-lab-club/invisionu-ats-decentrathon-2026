SELECT
    a.id AS application_id,
    TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) AS full_name,
    p.name AS program_name,
    a.review_stage,
    a.decision,
    sr.recommendation,
    a.ai_probability,
    a.ielts_score,
    a.ent_score
FROM applications a
JOIN users u ON u.id = a.user_id
JOIN programs p ON p.id = a.program_id
LEFT JOIN LATERAL (
    SELECT recommendation
    FROM scoring_runs
    WHERE application_id = a.id
    ORDER BY created_at DESC
    LIMIT 1
) sr ON TRUE
WHERE 1=1
