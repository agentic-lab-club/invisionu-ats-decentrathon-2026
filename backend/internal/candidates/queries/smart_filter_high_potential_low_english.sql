-- Preset: high_potential_low_english
-- High leadership potential with weak planning/structure (proxy for low English proficiency).
-- High leadership = L > 3.0 (top tier), low planning/structure = P < 2.6.
SELECT
    a.id AS application_id,
    TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) AS full_name,
    p.name AS program_name,
    a.review_stage,
    a.decision,
    sr.recommendation,
    a.ai_probability,
    a.ielts_score,
    a.ent_score,
    -- Axis scores (0-100) and Potential — same formula as list_candidates.sql
    LEAST(100, ROUND(((sr.result_json -> 'aggregated_metrics' ->> 'Motivation')::float    * (100.0/5.0))::numeric, 1)) AS axis_m,
    LEAST(100, ROUND(((sr.result_json -> 'aggregated_metrics' ->> 'Planning')::float      * (100.0/5.0))::numeric, 1)) AS axis_p,
    LEAST(100, ROUND(((sr.result_json -> 'aggregated_metrics' ->> 'Resilience')::float    * (100.0/5.0))::numeric, 1)) AS axis_r,
    LEAST(100, ROUND(((sr.result_json -> 'aggregated_metrics' ->> 'Leadership')::float    * (100.0/5.0))::numeric, 1)) AS axis_l,
    LEAST(100, ROUND(((sr.result_json -> 'aggregated_metrics' ->> 'Values')::float        * (100.0/5.0))::numeric, 1)) AS axis_v,
    LEAST(100, ROUND(CAST((
        0.15 * COALESCE((sr.result_json -> 'aggregated_metrics' ->> 'Motivation')::float,  0) +
        0.15 * COALESCE((sr.result_json -> 'aggregated_metrics' ->> 'Planning')::float,    0) +
        0.20 * COALESCE((sr.result_json -> 'aggregated_metrics' ->> 'Resilience')::float,  0) +
        0.35 * COALESCE((sr.result_json -> 'aggregated_metrics' ->> 'Leadership')::float,  0) +
        0.15 * COALESCE((sr.result_json -> 'aggregated_metrics' ->> 'Values')::float,      0)
    ) * (100.0/5.0) AS numeric), 1)) AS overall_score
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
    (sr.result_json -> 'aggregated_metrics' ->> 'Leadership') IS NOT NULL
    AND (sr.result_json -> 'aggregated_metrics' ->> 'Planning') IS NOT NULL
    AND (sr.result_json -> 'aggregated_metrics' ->> 'Leadership')::float > 3.0
    AND (sr.result_json -> 'aggregated_metrics' ->> 'Planning')::float < 2.6
ORDER BY (sr.result_json -> 'aggregated_metrics' ->> 'Leadership')::float DESC;
