# Applications Module Contract

## Purpose

Own applicant application submission and applicant-facing status lookup.

This module turns:
- selected program
- uploaded asset ids
- profile fields
- personality test answers

into a persisted `applications` row plus related attachments and answers.

## Responsibilities

- Accept one application submission from an authenticated applicant.
- Enforce email verification before submission.
- Enforce file ownership and expected file types.
- Persist application, attached files, and personality answers in one DB transaction.
- Launch async video screening after commit.
- Return the latest application status for the current applicant.

## Out Of Scope

- Admin review actions.
- Asset upload itself.
- Program catalog management.
- Personality test authoring.
- Event consumption / scoring pipeline processing.

## Domain Concepts / Entities

### `Application`

Relevant fields:
- `id`
- `user_id`
- `program_id`
- `review_stage`
- `decision`
- `video_file_id`
- `screening_error`
- `screening_status`
- `submitted_at`

Initial values on create:
- `review_stage = initial_screening`
- `decision = pending`
- `screening_status = pending`

### Review stages

- `initial_screening`
- `application_review`
- `decision`

### Decisions

- `pending`
- `accepted`
- `rejected`

### Submitted event

```json
{
  "application_id": "11111111-1111-1111-1111-111111111111"
}
```

## Endpoint Overview

### `POST /applications/`

Submit a new application for the authenticated applicant.

Request example:

```json
{
  "first_name": "Ada",
  "last_name": "Lovelace",
  "phone_number": "+77000000000",
  "program_code": "undergrad_tech",
  "video_file_id": "11111111-1111-1111-1111-111111111111",
  "portfolio_file_id": "22222222-2222-2222-2222-222222222222",
  "english_result_file_id": null,
  "certificate_file_id": null,
  "personality_test_answers": [
    {
      "question_id": "33333333-3333-3333-3333-333333333333",
      "option_id": "44444444-4444-4444-4444-444444444444"
    }
  ]
}
```

Success:

```json
{
  "application_id": "55555555-5555-5555-5555-555555555555"
}
```

### `GET /applications/status`

Return the latest application status for the authenticated applicant.

Success example:

```json
{
  "application_id": "55555555-5555-5555-5555-555555555555",
  "review_stage": "initial_screening",
  "decision": "pending",
  "screening_status": "processing",
  "screening_error": null
}
```

## Auth / Roles

- Both routes require bearer token with role `user`.
- Admin tokens are not accepted by this module.

## Request / Response Conventions

- Create request is JSON and validated by shared body-binding middleware.
- `status` response is minimal; it does not include program metadata or assets.
- Error body shape comes from shared responder helpers, not this module.

## Business Flows

### Submission flow

1. Load current user.
2. Require `is_email_verified = true`.
3. Count active applications for the user.
4. Reject if there is already an application with `decision = pending`.
5. Resolve `program_code` and require active program.
6. Validate each provided file id:
   - record exists
   - belongs to current user
   - not already attached
   - matches expected file type
7. Validate each personality answer pair against existing question/option rows.
8. Start DB transaction.
9. Update user profile fields.
10. Create application row.
11. Attach files to application.
12. Insert personality test answers.
13. Commit transaction.
14. Start async screening pipeline:
    - download video from object storage
    - extract audio with `ffmpeg`
    - upload derived audio
    - call STT with presigned URL
    - save transcript
    - call LLM scoring
    - save scoring result or screening error
15. Publish the configured `application submitted` event on the bus.

### Status flow

1. Load the latest application for the current user ordered by `created_at DESC`.
2. Return `application_id`, `review_stage`, `decision`, `screening_error`.

## Validation Rules

Request validation visible in code:
- `first_name`: required, min `1`, max `255`
- `last_name`: required, min `1`, max `255`
- `phone_number`: required, min `3`, max `64`
- `program_code`: required
- `video_file_id`: required UUID
- `portfolio_file_id`: optional UUID
- `english_result_file_id`: optional UUID
- `certificate_file_id`: optional UUID
- each personality answer requires:
  - `question_id`
  - `option_id`

Additional service rules:
- user must exist
- user email must be verified
- only one `decision = pending` application is allowed
- referenced program must exist and be active
- referenced files must belong to the same user and be unattached
- file type mapping is strict:
  - `video_file_id` -> `video_presentation`
  - `portfolio_file_id` -> `portfolio`
  - `english_result_file_id` -> `english_result`
  - `certificate_file_id` -> `certificate`
- every submitted personality answer pair must be valid

## Lifecycle / State Transitions

Application lifecycle visible here:

1. created on submission
2. initial state:
   - `review_stage = initial_screening`
   - `decision = pending`
3. later transitions happen outside this module

The module treats `decision = pending` as an active application.

## Error Handling

Handler status mapping:
- `POST /applications/`
  - `401` when auth context is missing
  - `400` for all service failures, including business-rule failures
- `GET /applications/status`
  - `401` when auth context is missing
  - `404` when no application exists
  - `500` when repository lookup fails

Representative create errors:
- `user not found`
- `email is not verified`
- `active application already exists`
- `program is invalid or inactive`
- `file not found`
- `file does not belong to current user`
- `file is already attached`
- `invalid file type`
- `invalid personality test answer`

Important implementation detail:
- the DB transaction commits before event publish
- if bus publish fails, the handler still returns an error even though the application is already persisted

## Security Notes

- Only authenticated applicants can submit or read their status.
- File ownership is enforced before attachment.
- The module trusts auth middleware for user identity.
- Messaging payload contains only `application_id`.

## Frontend Integration Notes

- Upload assets first via the assets module, then submit returned file ids here.
- `GET /applications/status` is the applicant polling endpoint; it returns only status fields.
- Treat `400` from create as a business-rule rejection unless logs show infrastructure failure.
- Because publish happens after commit, a failed create response may still correspond to a stored application; retry logic should be conservative.

## Known Limitations / TODO

- No idempotency key for create.
- No draft application concept.
- No per-field error envelope beyond shared responder output.
- Event publish is not transactional with DB commit; there is no outbox.
- `status` only exposes the latest application, not historical list.

## Related Files / Modules

- `internal/applications/module.go`
- `internal/applications/handler.go`
- `internal/applications/service.go`
- `internal/applications/repository.go`
- `internal/applications/domain.go`
- `internal/applications/queries.go`
- `internal/assets`
- `internal/programs`
- `internal/personalitytest`
- `internal/platform/messaging`
