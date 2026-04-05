-- Weights for the Potential score (must sum to 1.0).
-- Mirror the "Balanced Leader" formula already used in the frontend detail page.
-- M=0.15, P=0.15, R=0.20, L=0.35, V=0.15
--
-- aggregated_metrics values are on a 0–3 scale → multiply by (100/3) to get 0–100.

WITH axis_scale AS (
    SELECT 100.0 / 5.0 AS factor   -- converts 0-5 raw score to 0-100
)
SELECT
    a.id AS application_id,
    TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) AS full_name,
    p.name AS program_name,
    a.review_stage,
    a.decision,
    sr.recommendation,

    -- Individual axes (0-100), NULL when not scored yet
    LEAST(100, ROUND(((sr.result_json -> 'aggregated_metrics' ->> 'Motivation')::float    * (SELECT factor FROM axis_scale))::numeric, 1)) AS axis_m,
    LEAST(100, ROUND(((sr.result_json -> 'aggregated_metrics' ->> 'Planning')::float      * (SELECT factor FROM axis_scale))::numeric, 1)) AS axis_p,
    LEAST(100, ROUND(((sr.result_json -> 'aggregated_metrics' ->> 'Resilience')::float    * (SELECT factor FROM axis_scale))::numeric, 1)) AS axis_r,
    LEAST(100, ROUND(((sr.result_json -> 'aggregated_metrics' ->> 'Leadership')::float    * (SELECT factor FROM axis_scale))::numeric, 1)) AS axis_l,
    LEAST(100, ROUND(((sr.result_json -> 'aggregated_metrics' ->> 'Values')::float        * (SELECT factor FROM axis_scale))::numeric, 1)) AS axis_v,

    -- Potential = weighted sum of the five axes (0-100)
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
    SELECT recommendation, result_json
    FROM scoring_runs
    WHERE application_id = a.id
      AND model_name = 'llmscoring'
    ORDER BY created_at DESC
    LIMIT 1
) sr ON TRUE
WHERE 1=1