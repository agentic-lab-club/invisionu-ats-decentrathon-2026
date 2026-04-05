WITH axis_scale AS (
    SELECT 100.0 / 5.0 AS factor
)
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
    a.ai_probability,
    a.ielts_score,
    a.ent_score::float AS ent_score,
    LEAST(100, ROUND(CAST((
        0.15 * COALESCE((sr.result_json -> 'aggregated_metrics' ->> 'Motivation')::float,  0) +
        0.15 * COALESCE((sr.result_json -> 'aggregated_metrics' ->> 'Planning')::float,    0) +
        0.20 * COALESCE((sr.result_json -> 'aggregated_metrics' ->> 'Resilience')::float,  0) +
        0.35 * COALESCE((sr.result_json -> 'aggregated_metrics' ->> 'Leadership')::float,  0) +
        0.15 * COALESCE((sr.result_json -> 'aggregated_metrics' ->> 'Values')::float,      0)
    ) * (SELECT factor FROM axis_scale) AS numeric), 1)) AS overall_score
FROM applications a
JOIN users u ON u.id = a.user_id
JOIN programs p ON p.id = a.program_id
LEFT JOIN LATERAL (
    SELECT result_json
    FROM scoring_runs
    WHERE application_id = a.id
      AND model_name = 'llmscoring'
    ORDER BY created_at DESC
    LIMIT 1
) sr ON TRUE
WHERE a.id = ?;
