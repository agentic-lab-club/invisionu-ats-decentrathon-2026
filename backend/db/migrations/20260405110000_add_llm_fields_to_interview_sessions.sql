-- +goose Up
-- +goose StatementBegin
ALTER TABLE interview_sessions
    ADD COLUMN IF NOT EXISTS llm_raw_output TEXT,
    ADD COLUMN IF NOT EXISTS error_log      TEXT;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE interview_sessions
    DROP COLUMN IF EXISTS llm_raw_output,
    DROP COLUMN IF EXISTS error_log;
-- +goose StatementEnd