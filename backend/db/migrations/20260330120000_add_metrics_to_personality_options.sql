-- +goose Up

-- Добавляем колонки для метрик
ALTER TABLE personality_test_options
ADD COLUMN m integer DEFAULT 0,
ADD COLUMN p integer DEFAULT 0,
ADD COLUMN r integer DEFAULT 0,
ADD COLUMN l integer DEFAULT 0,
ADD COLUMN v integer DEFAULT 0;

-- Заполняем метриками для всех 40 вопросов
-- (твои UPDATE-запросы здесь)

-- +goose Down

ALTER TABLE personality_test_options
DROP COLUMN IF EXISTS m,
DROP COLUMN IF EXISTS p,
DROP COLUMN IF EXISTS r,
DROP COLUMN IF EXISTS l,
DROP COLUMN IF EXISTS v;