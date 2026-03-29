-- ============================================
-- 1. Веса критериев (по умолчанию)
-- ============================================
INSERT INTO weight_settings (motivation_weight, leadership_weight, structure_weight, set_by, set_at)
VALUES (33.33, 33.33, 33.34, 'system', NOW())
ON CONFLICT DO NOTHING;

-- ============================================
-- 2. Кандидаты, заявки, оценки, статусы, ML-анализ
-- ============================================

-- Кандидат 1: Иван Петров (Entrepreneurship)
WITH cand AS (
    INSERT INTO candidates (
        id, external_id, created_at, updated_at, data_source,
        ielts_score, first_name, last_name, patronymic, date_of_birth,
        gender, citizenship, iin, country, city, mobile_phone,
        program, video_link, english_exam
    ) VALUES (
        gen_random_uuid(), 'ext_ivan', NOW(), NOW(), 'seed',
        7.5, 'Иван', 'Петров', 'Иванович', '2000-01-15',
        'male', 'Kazakhstan', '123456789012', 'Казахстан', 'Алматы', '+77771234567',
        'Entrepreneurship', 'https://youtu.be/ivan', 'IELTS'
    )
    RETURNING id
), app AS (
    INSERT INTO applications (candidate_id, submitted_at, structured_data, essay_text)
    SELECT id, NOW(), 
        '{"name":"Иван Петров","program":"Entrepreneurship","motivation_evidence":"Основал школьный стартап","leadership_evidence":"Капитан команды","structure_evidence":"Эссе структурировано"}',
        'Моя цель – создать бизнес, который поможет людям.'
    FROM cand
    RETURNING id
), score AS (
    INSERT INTO scores (application_id, overall_score, motivation_avg, leadership_avg, structure_avg, calculated_at)
    SELECT id, 87, 90, 85, 88, NOW()
    FROM app
    RETURNING application_id, overall_score, motivation_avg, leadership_avg, structure_avg
), status AS (
    INSERT INTO candidate_statuses (candidate_id, status, comment, created_by, created_at)
    SELECT cand.id, 'new', 'Заявка подана', 'system', NOW()
    FROM cand
)
INSERT INTO ml_analysis (application_id, analysis_json, created_at, updated_at)
SELECT 
    app.id,
    jsonb_build_object(
        'categories', jsonb_build_object(
            'Motivation', score.motivation_avg,
            'Leadership', score.leadership_avg,
            'Structure', score.structure_avg
        ),
        'explanation', 'Иван демонстрирует высокий предпринимательский потенциал. Его эссе содержит конкретные примеры инициативы и ответственности. Рекомендуется к дальнейшему рассмотрению.'
    ),
    NOW(), NOW()
FROM app, score;

-- Кандидат 2: Мария Смирнова (Social Impact)
WITH cand AS (
    INSERT INTO candidates (
        id, external_id, created_at, updated_at, data_source,
        ielts_score, first_name, last_name, patronymic, date_of_birth,
        gender, citizenship, iin, country, city, mobile_phone,
        program, video_link, english_exam
    ) VALUES (
        gen_random_uuid(), 'ext_maria', NOW(), NOW(), 'seed',
        8.0, 'Мария', 'Смирнова', 'Алексеевна', '2001-03-22',
        'female', 'Kazakhstan', '234567890123', 'Казахстан', 'Астана', '+77772345678',
        'Social Impact', 'https://youtu.be/maria', 'TOEFL'
    )
    RETURNING id
), app AS (
    INSERT INTO applications (candidate_id, submitted_at, structured_data, essay_text)
    SELECT id, NOW(),
        '{"name":"Мария Смирнова","program":"Social Impact","motivation_evidence":"Волонтёрство в фонде","leadership_evidence":"Организация экологической акции","structure_evidence":"Эссе с чёткой структурой"}',
        'Хочу решать социальные проблемы через технологии.'
    FROM cand
    RETURNING id
), score AS (
    INSERT INTO scores (application_id, overall_score, motivation_avg, leadership_avg, structure_avg, calculated_at)
    SELECT id, 94, 96, 93, 92, NOW()
    FROM app
    RETURNING application_id, overall_score, motivation_avg, leadership_avg, structure_avg
), status AS (
    INSERT INTO candidate_statuses (candidate_id, status, comment, created_by, created_at)
    SELECT cand.id, 'review', 'На рассмотрении', 'system', NOW()
    FROM cand
)
INSERT INTO ml_analysis (application_id, analysis_json, created_at, updated_at)
SELECT 
    app.id,
    jsonb_build_object(
        'categories', jsonb_build_object(
            'Motivation', score.motivation_avg,
            'Leadership', score.leadership_avg,
            'Structure', score.structure_avg
        ),
        'explanation', 'Мария обладает исключительными лидерскими качествами и мотивацией для социальных изменений. Примеры из её опыта впечатляют. Рекомендуется к зачислению.'
    ),
    NOW(), NOW()
FROM app, score;

-- Кандидат 3: Алексей Иванов (Technology Innovation)
WITH cand AS (
    INSERT INTO candidates (
        id, external_id, created_at, updated_at, data_source,
        ielts_score, first_name, last_name, patronymic, date_of_birth,
        gender, citizenship, iin, country, city, mobile_phone,
        program, video_link, english_exam
    ) VALUES (
        gen_random_uuid(), 'ext_alexey', NOW(), NOW(), 'seed',
        6.5, 'Алексей', 'Иванов', 'Сергеевич', '1999-11-05',
        'male', 'Kazakhstan', '345678901234', 'Казахстан', 'Шымкент', '+77773456789',
        'Technology Innovation', 'https://youtu.be/alexey', 'IELTS'
    )
    RETURNING id
), app AS (
    INSERT INTO applications (candidate_id, submitted_at, structured_data, essay_text)
    SELECT id, NOW(),
        '{"name":"Алексей Иванов","program":"Technology Innovation","motivation_evidence":"Создал приложение","leadership_evidence":"Менторство в IT-клубе","structure_evidence":"Лаконичное эссе"}',
        'Хочу разрабатывать AI-решения для образования.'
    FROM cand
    RETURNING id
), score AS (
    INSERT INTO scores (application_id, overall_score, motivation_avg, leadership_avg, structure_avg, calculated_at)
    SELECT id, 78, 75, 70, 85, NOW()
    FROM app
    RETURNING application_id, overall_score, motivation_avg, leadership_avg, structure_avg
), status AS (
    INSERT INTO candidate_statuses (candidate_id, status, comment, created_by, created_at)
    SELECT cand.id, 'interview', 'Приглашён на собеседование', 'system', NOW()
    FROM cand
)
INSERT INTO ml_analysis (application_id, analysis_json, created_at, updated_at)
SELECT 
    app.id,
    jsonb_build_object(
        'categories', jsonb_build_object(
            'Motivation', score.motivation_avg,
            'Leadership', score.leadership_avg,
            'Structure', score.structure_avg
        ),
        'explanation', 'Алексей обладает техническими навыками, но его лидерский опыт ограничен. Стоит оценить его потенциал на собеседовании.'
    ),
    NOW(), NOW()
FROM app, score;

-- Кандидат 4: Елена Козлова (Public Policy)
WITH cand AS (
    INSERT INTO candidates (
        id, external_id, created_at, updated_at, data_source,
        ielts_score, first_name, last_name, patronymic, date_of_birth,
        gender, citizenship, iin, country, city, mobile_phone,
        program, video_link, english_exam
    ) VALUES (
        gen_random_uuid(), 'ext_elena', NOW(), NOW(), 'seed',
        8.5, 'Елена', 'Козлова', 'Дмитриевна', '2002-07-19',
        'female', 'Kazakhstan', '456789012345', 'Казахстан', 'Караганда', '+77774567890',
        'Public Policy', 'https://youtu.be/elena', 'TOEFL'
    )
    RETURNING id
), app AS (
    INSERT INTO applications (candidate_id, submitted_at, structured_data, essay_text)
    SELECT id, NOW(),
        '{"name":"Елена Козлова","program":"Public Policy","motivation_evidence":"Публикации в газете","leadership_evidence":"Основала дебатный клуб","structure_evidence":"Эссе с аналитикой"}',
        'Хочу влиять на государственные решения.'
    FROM cand
    RETURNING id
), score AS (
    INSERT INTO scores (application_id, overall_score, motivation_avg, leadership_avg, structure_avg, calculated_at)
    SELECT id, 92, 88, 95, 90, NOW()
    FROM app
    RETURNING application_id, overall_score, motivation_avg, leadership_avg, structure_avg
), status AS (
    INSERT INTO candidate_statuses (candidate_id, status, comment, created_by, created_at)
    SELECT cand.id, 'recommended', 'Рекомендована к зачислению', 'system', NOW()
    FROM cand
)
INSERT INTO ml_analysis (application_id, analysis_json, created_at, updated_at)
SELECT 
    app.id,
    jsonb_build_object(
        'categories', jsonb_build_object(
            'Motivation', score.motivation_avg,
            'Leadership', score.leadership_avg,
            'Structure', score.structure_avg
        ),
        'explanation', 'Елена – прирождённый лидер с сильной мотивацией и отличной структурой мышления. Идеальный кандидат для публичной политики.'
    ),
    NOW(), NOW()
FROM app, score;

-- Кандидат 5: Дмитрий Соколов (Environmental Studies)
WITH cand AS (
    INSERT INTO candidates (
        id, external_id, created_at, updated_at, data_source,
        ielts_score, first_name, last_name, patronymic, date_of_birth,
        gender, citizenship, iin, country, city, mobile_phone,
        program, video_link, english_exam
    ) VALUES (
        gen_random_uuid(), 'ext_dmitry', NOW(), NOW(), 'seed',
        5.5, 'Дмитрий', 'Соколов', 'Олегович', '2000-09-30',
        'male', 'Kazakhstan', '567890123456', 'Казахстан', 'Актобе', '+77775678901',
        'Environmental Studies', 'https://youtu.be/dmitry', 'IELTS'
    )
    RETURNING id
), app AS (
    INSERT INTO applications (candidate_id, submitted_at, structured_data, essay_text)
    SELECT id, NOW(),
        '{"name":"Дмитрий Соколов","program":"Environmental Studies","motivation_evidence":"Участие в посадке деревьев","leadership_evidence":"Нет опыта","structure_evidence":"Эссе неструктурировано"}',
        'Люблю природу, хочу узнать больше об экологии.'
    FROM cand
    RETURNING id
), score AS (
    INSERT INTO scores (application_id, overall_score, motivation_avg, leadership_avg, structure_avg, calculated_at)
    SELECT id, 62, 70, 50, 65, NOW()
    FROM app
    RETURNING application_id, overall_score, motivation_avg, leadership_avg, structure_avg
), status AS (
    INSERT INTO candidate_statuses (candidate_id, status, comment, created_by, created_at)
    SELECT cand.id, 'rejected', 'Низкий лидерский потенциал', 'system', NOW()
    FROM cand
)
INSERT INTO ml_analysis (application_id, analysis_json, created_at, updated_at)
SELECT 
    app.id,
    jsonb_build_object(
        'categories', jsonb_build_object(
            'Motivation', score.motivation_avg,
            'Leadership', score.leadership_avg,
            'Structure', score.structure_avg
        ),
        'explanation', 'Дмитрий проявляет интерес к экологии, но не демонстрирует лидерских качеств и структурированного мышления. Не рекомендуется.'
    ),
    NOW(), NOW()
FROM app, score;

-- ============================================
-- 3. Ответы на тест (40 ответов для каждого кандидата)
-- ============================================
-- В реальности можно сгенерировать разнообразные ответы, здесь для простоты все 'a'
DO $$
DECLARE
    cand_record RECORD;
    i INT;
BEGIN
    FOR cand_record IN SELECT id FROM candidates LOOP
        FOR i IN 1..40 LOOP
            INSERT INTO personality_test_answers (candidate_id, question_index, answer_value)
            VALUES (cand_record.id, i, 
                CASE 
                    WHEN i % 4 = 0 THEN 'd'
                    WHEN i % 3 = 0 THEN 'c'
                    WHEN i % 2 = 0 THEN 'b'
                    ELSE 'a'
                END
            );
        END LOOP;
    END LOOP;
END $$;