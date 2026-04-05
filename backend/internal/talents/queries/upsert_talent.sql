INSERT INTO talent_leads (
    id,
    source,
    link,
    title,
    high_school_student_name,
    published_at,
    published_date_raw,
    winner_info,
    raw_payload,
    synced_at
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT (link) DO UPDATE SET
    source = EXCLUDED.source,
    title = EXCLUDED.title,
    high_school_student_name = EXCLUDED.high_school_student_name,
    published_at = EXCLUDED.published_at,
    published_date_raw = EXCLUDED.published_date_raw,
    winner_info = EXCLUDED.winner_info,
    raw_payload = EXCLUDED.raw_payload,
    synced_at = EXCLUDED.synced_at
