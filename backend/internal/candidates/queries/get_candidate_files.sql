SELECT
    id,
    file_type,
    original_filename,
    content_type,
    size_bytes
FROM application_files
WHERE application_id = ?
ORDER BY created_at ASC;
