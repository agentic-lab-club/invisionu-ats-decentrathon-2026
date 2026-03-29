SELECT
    id,
    model_name,
    recommendation,
    result_json,
    created_at
FROM scoring_runs
WHERE application_id = ?
ORDER BY created_at DESC
LIMIT 1;
