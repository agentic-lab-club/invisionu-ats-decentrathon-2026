UPDATE assessment_sessions
SET evaluation = ?,
    overall_score = ?,
    leadership_score = ?,
    status = ?,
    completed_at = ?,
    llm_raw_output = ?,
    error_log = NULL
WHERE id = ?;
