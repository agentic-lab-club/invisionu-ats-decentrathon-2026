SELECT
    pt.id,
    pt.code,
    pt.title,
    q.id AS question_id,
    q.question_order,
    q.question_text,
    o.id AS option_id,
    o.option_order,
    o.option_key,
    o.option_text
FROM personality_tests pt
JOIN personality_test_questions q ON q.test_id = pt.id AND q.is_active = TRUE
JOIN personality_test_options o ON o.question_id = q.id
WHERE pt.is_active = TRUE
ORDER BY q.question_order ASC, o.option_order ASC;
