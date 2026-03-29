SELECT
    id,
    uploaded_by_user_id,
    application_id,
    file_type
FROM application_files
WHERE id = ?;
