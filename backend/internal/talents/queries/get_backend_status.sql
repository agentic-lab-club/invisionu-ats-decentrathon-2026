SELECT
    COUNT(*) AS total_in_db,
    MAX(synced_at) AS last_synced_at
FROM talent_leads
