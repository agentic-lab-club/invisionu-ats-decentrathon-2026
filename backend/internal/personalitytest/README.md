# Personality Test Module Contract

## Purpose

Own authenticated read access to the current active personality test used in the application flow.

## Responsibilities

- Return the single active personality test.
- Return nested questions and options in query order.
- Expose IDs that the applications module later validates in submitted answers.

## Out Of Scope

- Test authoring or editing.
- Test submission.
- Scoring or interpretation of answers.
- Listing historical/inactive test versions.

## Domain Concepts / Entities

### `Test`

Fields:
- `test_id`
- `code`
- `title`
- `questions`

### `Question`

Fields:
- `id`
- `order`
- `text`
- `options`

### `Option`

Fields:
- `id`
- `key`
- `text`

Internal field `option_order` exists in code but is not emitted in JSON.

## Endpoint Overview

### `GET /tests/personality/current`

Return the current active personality test.

Success example:

```json
{
  "test_id": "11111111-1111-1111-1111-111111111111",
  "code": "personality_v1",
  "title": "Personality Test",
  "questions": [
    {
      "id": "22222222-2222-2222-2222-222222222222",
      "order": 1,
      "text": "Question text",
      "options": [
        {
          "id": "33333333-3333-3333-3333-333333333333",
          "key": "A",
          "text": "Option text"
        }
      ]
    }
  ]
}
```

## Auth / Roles

- Bearer token required.
- Allowed roles: `user`, `admin`.

## Request / Response Conventions

- No request body.
- No query params.
- Response is a single `Test` object, not wrapped in `{items: ...}`.
- Error body shape uses shared responder helpers.

## Business Flows

1. Auth middleware validates bearer token.
2. Repository selects rows for `personality_tests.is_active = TRUE`.
3. Repository assembles flat SQL rows into nested `questions -> options`.
4. Handler returns `404` when no active test is found.

## Validation Rules

- No user-supplied input other than bearer token.
- Active-test selection is driven by DB flag `is_active = TRUE`.

## Lifecycle / State Transitions

- This module is read-only.
- Test activation/inactivation lifecycle is managed outside this module, currently by seeding/upsert logic.

## Error Handling

- `401 Unauthorized`
  - missing or invalid bearer token
- `404 Not Found`
  - no active personality test rows returned
- `500 Internal Server Error`
  - repository query failure

## Security Notes

- Endpoint is authenticated even though data is mostly reference data.
- IDs returned here are later accepted by the applications module and validated against DB.

## Frontend Integration Notes

- Use question/option IDs exactly as returned when submitting `personality_test_answers` to the applications module.
- Respect `order` when rendering questions.
- Do not depend on `option_order`; it is not part of the JSON contract.

## Known Limitations / TODO

- No endpoint to fetch a test by code or version.
- No endpoint to submit answers independently of application submission.
- If more than one test is marked active in DB, query behavior depends on data integrity; module assumes one active test.

## Related Files / Modules

- `internal/personalitytest/module.go`
- `internal/personalitytest/handler.go`
- `internal/personalitytest/service.go`
- `internal/personalitytest/repository.go`
- `internal/personalitytest/domain.go`
- `internal/personalitytest/queries.go`
- `internal/applications`
- `internal/seeder`
