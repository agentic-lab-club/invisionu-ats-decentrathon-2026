-- Preset: low_motivation_high_background
-- Low motivation but strong leadership/background signals.
-- Motivation below median (< 2.6), Leadership above lower median (> 2.0).
SELECT
    a.id AS application_id,
    TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) AS full_name,
    p.name AS program_name,
    a.review_stage,
    a.decision,
    sr.recommendation,
    a.ielts_score
FROM applications a
JOIN users u ON u.id = a.user_id
JOIN programs p ON p.id = a.program_id
JOIN LATERAL (
    SELECT recommendation, result_json
    FROM scoring_runs
    WHERE application_id = a.id
    ORDER BY created_at DESC
    LIMIT 1
) sr ON TRUE
WHERE
    (sr.result_json -> 'aggregated_metrics' ->> 'Motivation') IS NOT NULL
    AND (sr.result_json -> 'aggregated_metrics' ->> 'Leadership') IS NOT NULL
    AND (sr.result_json -> 'aggregated_metrics' ->> 'Motivation')::float < 2.6
    AND (sr.result_json -> 'aggregated_metrics' ->> 'Leadership')::float > 2.0
ORDER BY (sr.result_json -> 'aggregated_metrics' ->> 'Leadership')::float DESC;
