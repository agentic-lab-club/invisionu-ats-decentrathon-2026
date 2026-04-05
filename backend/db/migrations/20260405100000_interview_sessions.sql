-- +goose Up
-- +goose StatementBegin

-- interview_sessions stores each AI video-interview session for an applicant.
-- One session = one full AIYA interview (5 questions by default).
-- Answers are stored as a JSONB array appended incrementally (one per question).
-- Score is populated by the mock scorer now and will be replaced by the ML
-- service once it is ready; the column schema is forwards-compatible.

CREATE TABLE IF NOT EXISTS interview_sessions (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- status lifecycle: pending → active → completed | cancelled | expired
    -- "scored" is set when the real ML service writes back a score.
    status       VARCHAR(32) NOT NULL DEFAULT 'pending',

    -- JSONB arrays of strings (questions and answers are parallel by index).
    questions    JSONB       NOT NULL DEFAULT '[]'::jsonb,
    answers      JSONB       NOT NULL DEFAULT '[]'::jsonb,

    -- Scoring payload written by mock scorer (scored_by = "mock") or ML service.
    score        JSONB,

    -- Timing
    expires_at   TIMESTAMPTZ NOT NULL,
    started_at   TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lookup by user for idempotent session creation.
CREATE INDEX IF NOT EXISTS idx_interview_sessions_user_status
    ON interview_sessions(user_id, status);

-- Expiry sweeps.
CREATE INDEX IF NOT EXISTS idx_interview_sessions_expires_at
    ON interview_sessions(expires_at)
    WHERE status IN ('pending', 'active');

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS interview_sessions;
-- +goose StatementEnd
