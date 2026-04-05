-- Preset: top10_percent
-- AdmissionsPotential >= 90th percentile across all scored applications
WITH percentile AS (
    SELECT PERCENTILE_CONT(0.90) WITHIN GROUP (
        ORDER BY (result_json -> 'global_score' ->> 'AdmissionsPotential')::float
    ) AS threshold
    FROM scoring_runs sr_inner
    WHERE result_json -> 'global_score' ->> 'AdmissionsPotential' IS NOT NULL
)
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
CROSS JOIN percentile
WHERE
    (sr.result_json -> 'global_score' ->> 'AdmissionsPotential')::float >= percentile.threshold
ORDER BY (sr.result_json -> 'global_score' ->> 'AdmissionsPotential')::float DESC;
