SELECT
    id,
    uploaded_by_user_id,
    application_id,
    file_type,
    bucket_name,
    object_key,
    original_filename,
    content_type,
    size_bytes,
    etag
FROM application_files
WHERE id = ?;
