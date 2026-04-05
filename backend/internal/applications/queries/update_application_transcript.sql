UPDATE applications
SET
    video_transcript = ?,
    updated_at = NOW()
WHERE id = ?;
