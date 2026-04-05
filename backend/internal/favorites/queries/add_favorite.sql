INSERT INTO user_favorites (user_id, candidate_id)
VALUES (?, ?)
ON CONFLICT (user_id, candidate_id) DO NOTHING;