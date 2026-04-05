# Seeder Module Contract

## Purpose

Own idempotent seeding of backend reference data required for startup.

Current seeded domains:
- `programs`
- current `personality test`
- 1 admin reviewer for the admissions committee
- 6 demo applicants with completed applications and scoring artifacts

## Responsibilities

- Embed canonical seed data from JSON files inside `internal/seeder/data`.
- Upsert programs by `code`.
- Upsert one named personality test by `code`.
- Mark other personality tests inactive when seeding the current one.
- Upsert one fixed admin account with role `admin`.
- Run safely on repeated service restarts without duplicating seeded rows.

## Out Of Scope

- Full data migration management.
- Asset/object storage seeding.
- Standalone CLI command in the current codebase.

## Domain Concepts / Entities

### Programs seed document

Fields per item:
- `level`
- `code`
- `name`
- `sort_order`

### Personality test seed document

Fields:
- `code`
- `title`
- ordered `questions`

Question fields:
- `order`
- `text`
- `options`

### Demo applicant seed documents

Source inputs:
- `docs/jsons/final_interview_evaluation*.json`

Seeded records per applicant:
- `users`
- `applications`
- `application_files`
- `application_test_answers`
- `scoring_runs` for both `personality_test` and `llmscoring`

### Admin reviewer seed

Seeded reviewer record:
- `users`

Current seeded login:
- email: `admin@gmail.com`
- password: `TestPassword123`
- role: `admin`

## Endpoint Overview

- No HTTP endpoints.

## Auth / Roles

- Not applicable.

## Request / Response Conventions

Public entry point:

```go
SeedDefaults(db *sqlx.DB) error
```

Behavior:
- returns `nil` on success
- returns wrapped error on JSON parse failure or DB write failure

## Business Flows

### Startup flow

1. `cmd/server/main.go` calls `seeder.SeedDefaults(db)` after DB initialization.
2. Embedded JSON documents are parsed.
3. Programs are inserted or updated by `code`.
4. Personality tests not matching the seeded `code` are marked inactive.
5. Seeded personality test is inserted or updated.
6. Questions are inserted or updated by `(test_id, question_order)`.
7. Options are inserted or updated by `(question_id, option_order)`.
8. One admissions committee admin user is upserted by a deterministic id.
9. Demo applicants are upserted by deterministic ids.
10. Each demo applicant gets a completed application with attached files, personality answers, transcript, and two scoring runs.

## Validation Rules

- Seed JSON must match the expected document shape.
- Program uniqueness is driven by DB conflict on `code`.
- Personality question uniqueness is driven by DB conflict on `(test_id, question_order)`.
- Personality option uniqueness is driven by DB conflict on `(question_id, option_order)`.
- Demo applicant rows are idempotent through fixed UUIDs and conflict updates.

Unknown:
- no semantic validation for duplicate option texts or skipped question orders inside JSON beyond what DB constraints enforce

## Lifecycle / State Transitions

### Program lifecycle under seeder

- existing program with same `code` is updated
- seeded programs are forced to `is_active = TRUE`

### Personality test lifecycle under seeder

- tests with other codes are set `is_active = FALSE`
- seeded test code is set `is_active = TRUE`
- matching questions/options are upserted

Important limitation:
- old questions/options that no longer exist in the embedded JSON are not explicitly deleted or deactivated by this module

### Demo applicant lifecycle under seeder

- demo applicants are kept in sync by fixed UUIDs
- applications are seeded as `review_stage = application_review`
- applications are seeded as `decision = pending`
- screening data is seeded as `screening_status = completed`

### Admin reviewer lifecycle under seeder

- the admin reviewer is kept in sync by a fixed UUID
- the reviewer is always seeded with `role = admin`
- email verification is forced to `TRUE`

## Error Handling

Representative failures:
- `failed to parse embedded programs seed`
- `failed to parse embedded personality test seed`
- `failed to read applicant scoring seed <file>`
- `failed to parse applicant scoring seed <file>`
- `failed to seed program <code>`
- `failed to begin seed transaction`
- `failed to deactivate old personality tests`
- `failed to upsert personality test`
- `failed to upsert question <n>`
- `failed to upsert option <n> for question <n>`
- `failed to commit seed transaction`
- `failed to begin mock applicant seed transaction`
- `failed to upsert seeded admin user <email>`
- `failed to upsert mock applicant user <email>`
- `failed to upsert mock application <id>`

## Security Notes

- Seed data is compiled into the binary via `go:embed`.
- Module assumes trusted repository contents.
- There is no auth boundary because this is startup-only code.
- Demo applicant scoring JSON is loaded from repository files under `docs/jsons` at startup. Runtime image already includes `docs/`.

## Frontend Integration Notes

- Frontend indirectly depends on this module because `programs` and `personalitytest` endpoints read seeded reference data.
- If embedded JSON changes, frontend-visible IDs and ordering may change after restart or deploy.

## Known Limitations / TODO

- No standalone manual reseed command in current code.
- No cleanup for removed questions/options.
- Startup fails hard if seeding fails.
- The seeded admin user has a fixed password `TestPassword123`; demo applicants use a separate precomputed bcrypt hash, and the module does not issue auth codes or refresh sessions.

## Related Files / Modules

- `internal/seeder/seeder.go`
- `internal/seeder/data/programs.json`
- `internal/seeder/data/personality-test.json`
- `docs/jsons/final_interview_evaluation*.json`
- `cmd/server/main.go`
- `internal/programs`
- `internal/personalitytest`
