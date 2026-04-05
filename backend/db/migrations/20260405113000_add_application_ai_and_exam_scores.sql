-- +goose Up
-- +goose StatementBegin
ALTER TABLE applications
    ADD COLUMN IF NOT EXISTS ai_probability NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS ielts_score NUMERIC(3,1),
    ADD COLUMN IF NOT EXISTS ent_score INTEGER;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE applications
    DROP COLUMN IF EXISTS ent_score,
    DROP COLUMN IF EXISTS ielts_score,
    DROP COLUMN IF EXISTS ai_probability;
-- +goose StatementEnd
