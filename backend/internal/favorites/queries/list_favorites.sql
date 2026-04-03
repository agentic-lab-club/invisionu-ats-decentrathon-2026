SELECT candidate_id
FROM user_favorites
WHERE user_id = ?
ORDER BY created_at DESC;