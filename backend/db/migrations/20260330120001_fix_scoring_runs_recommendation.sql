-- +goose Up
ALTER TABLE scoring_runs ALTER COLUMN recommendation DROP NOT NULL;

-- +goose Down
ALTER TABLE scoring_runs ALTER COLUMN recommendation SET NOT NULL;