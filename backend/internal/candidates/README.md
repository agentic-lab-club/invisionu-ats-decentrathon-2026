# Candidates Module Contract

## Purpose

Own admin reviewer APIs for candidate listing, candidate detail, and review stage updates.

## Responsibilities

- List applications for admin review with filters.
- Return detailed candidate view by `applicationId`.
- Update `review_stage` and optional `decision` for an application.
- Expose latest scoring run metadata when present.

## Out Of Scope

- Applicant-facing application submission.
- Asset binary download.
- Scoring execution.
- Program management.
- Enforcement of a complex review workflow state machine.

## Domain Concepts / Entities

### `ListItem`

Fields:
- `application_id`
- `full_name`
- `program_name`
- `review_stage`
- `decision`
- optional `recommendation`
- optional `ai_probability`
- optional `ielts_score`
- optional `ent_score`

### `Detail`

Fields:
- application id and applicant identity fields
- `program_name`
- `review_stage`
- `decision`
- optional `video_transcript`
- optional `screening_error`
- attached file metadata list
- optional `latest_scoring_run`

### `ScoringResult`

Fields:
- `id`
- `model_name`
- `recommendation`
- `result_json`
- `created_at`

Note:
- `result_json` is stored as `[]byte`; JSON encoding will expose byte content rather than a parsed object

## Endpoint Overview

### `GET /candidates/`

Optional query params:
- `program_code`
- `review_stage`
- `decision`
- `search`

Success example:

```json
{
  "items": [
    {
      "application_id": "11111111-1111-1111-1111-111111111111",
      "full_name": "Ada Lovelace",
      "program_name": "Tech (Innovative IT Product Design and Development)",
      "review_stage": "initial_screening",
      "decision": "pending",
      "recommendation": null,
      "ai_probability": 34.4,
      "ielts_score": 6.5,
      "ent_score": 42
    }
  ]
}
```

### `GET /candidates/{applicationId}`

Return full candidate detail for one application id.

### `PATCH /candidates/{applicationId}/stage`

Request example:

```json
{
  "review_stage": "application_review",
  "decision": "pending"
}
```

Success:

```json
{
  "message": "Candidate stage updated"
}
```

## Auth / Roles

- All routes require bearer token with role `admin`.

## Request / Response Conventions

- `applicationId` is passed as a path string and parsed as UUID in handlers.
- `GET` endpoints return JSON.
- `PATCH` request body is validated by shared middleware.
- Error body shape comes from shared responder helpers.

## Business Flows

### List flow

1. Read optional query filters.
2. Apply filters at SQL level:
   - program code
   - review stage
   - decision
   - search against applicant full name or email
3. Return newest applications first.

### Detail flow

1. Parse `applicationId` as UUID.
2. Load application + user + program detail row.
3. Load attached file metadata.
4. Load latest scoring run if one exists.
5. Return assembled detail response.

### Stage update flow

1. Parse `applicationId` as UUID.
2. Validate request body.
3. Update `review_stage`, and update `decision` only when a non-nil decision is provided.

## Validation Rules

Request validation visible in code:
- `review_stage` is required and must be one of:
  - `initial_screening`
  - `application_review`
  - `decision`
- `decision` is optional and, when provided, must be one of:
  - `pending`
  - `accepted`
  - `rejected`

Additional handler validation:
- `applicationId` must be a valid UUID

What is not validated here:
- allowed transition graph between stages
- allowed transition graph between decisions
- whether the target application exists before returning success from `PATCH`

## Lifecycle / State Transitions

This module can mutate:
- `review_stage`
- `decision` when request includes it

Current implementation behavior:
- omitting `decision` preserves the existing decision
- no module-level guard enforces valid stage progression

## Error Handling

Status mapping:
- `GET /candidates/`
  - `500` on repository failure
- `GET /candidates/{applicationId}`
  - `400` for invalid UUID
  - `404` when application detail is not found
  - `500` on repository failure
- `PATCH /candidates/{applicationId}/stage`
  - `400` for invalid UUID, invalid request body, or repository update failure

`PATCH` does not expose whether zero rows were updated.

## Security Notes

- All routes are admin-only.
- Search can query applicant email, but list response does not expose email directly.
- Detailed applicant PII is available on the detail endpoint to any caller with admin token.

## Frontend Integration Notes

- Use list endpoint for reviewer dashboard filters.
- Candidate list payload may include `ai_probability`, `ielts_score`, and `ent_score` when screening enrichment is available.
- Use detail endpoint when the reviewer opens a candidate profile.
- Do not assume `latest_scoring_run` is always present.
- Treat `result_json` as opaque payload bytes.
- Frontend should not infer workflow restrictions from backend; current backend accepts any validated stage/decision values.

## Known Limitations / TODO

- No pagination on candidate list.
- No explicit stage transition rules.
- `PATCH` does not return updated entity, only a message.
- `PATCH` does not surface a `404` for missing application id.

## Related Files / Modules

- `internal/candidates/module.go`
- `internal/candidates/handler.go`
- `internal/candidates/service.go`
- `internal/candidates/repository.go`
- `internal/candidates/domain.go`
- `internal/candidates/queries.go`
- `internal/applications`
- `internal/assets`
