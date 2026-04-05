UPDATE applications
SET
    video_audio_file_id = ?,
    updated_at = NOW()
WHERE id = ?;
