-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS assessment_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    specialization VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    answers JSONB,
    evaluation JSONB,
    overall_score DOUBLE PRECISION,
    leadership_score DOUBLE PRECISION,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    llm_raw_output TEXT,
    error_log TEXT
);

CREATE INDEX IF NOT EXISTS idx_assessment_sessions_user_created
    ON assessment_sessions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_assessment_sessions_status
    ON assessment_sessions(status);

CREATE INDEX IF NOT EXISTS idx_assessment_sessions_expires_at
    ON assessment_sessions(expires_at);

CREATE TABLE IF NOT EXISTS evaluation_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES assessment_sessions(id) ON DELETE CASCADE,
    llm_input_prompt TEXT NOT NULL,
    llm_raw_response TEXT NOT NULL,
    parsed_result JSONB,
    evaluation_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    evaluator_model VARCHAR(100) NOT NULL DEFAULT 'gpt-4o-mini'
);

CREATE INDEX IF NOT EXISTS idx_evaluation_audit_session_timestamp
    ON evaluation_audit(session_id, evaluation_timestamp DESC);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS evaluation_audit;
DROP TABLE IF EXISTS assessment_sessions;
-- +goose StatementEnd
