-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS talent_leads (
    id UUID PRIMARY KEY,
    source TEXT NOT NULL,
    link TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    high_school_student_name TEXT NULL,
    published_at TIMESTAMPTZ NULL,
    published_date_raw TEXT NULL,
    winner_info TEXT NULL,
    raw_payload JSONB NOT NULL,
    synced_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_talent_leads_source ON talent_leads(source);
CREATE INDEX IF NOT EXISTS idx_talent_leads_published_at ON talent_leads(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_talent_leads_synced_at ON talent_leads(synced_at DESC);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS talent_leads;
-- +goose StatementEnd
