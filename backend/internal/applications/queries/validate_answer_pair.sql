SELECT COUNT(*)
FROM personality_test_options
WHERE question_id = ?
  AND id = ?;
