-- +goose Up
-- +goose StatementBegin
ALTER TABLE applications
    ADD COLUMN IF NOT EXISTS screening_status VARCHAR(32) NOT NULL DEFAULT 'pending';

UPDATE applications
SET screening_status = CASE
    WHEN screening_error IS NOT NULL THEN 'failed'
    WHEN video_transcript IS NOT NULL THEN 'completed'
    ELSE 'pending'
END
WHERE screening_status IS NULL
   OR screening_status = '';

ALTER TABLE scoring_runs
    ALTER COLUMN recommendation DROP NOT NULL;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE scoring_runs
    ALTER COLUMN recommendation SET NOT NULL;

ALTER TABLE applications
    DROP COLUMN IF EXISTS screening_status;
-- +goose StatementEnd
