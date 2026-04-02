# Assessment Module

Assessment module migrates the legacy Python `Ai-Generate-Answer-Question-service`
into the Go backend.

## Scope

- Generates interview questions for a specialization
- Stores assessment sessions with expiry
- Accepts submitted answers
- Evaluates answers with an LLM
- Stores evaluation audit payloads

## Routes

- `POST /api/v1/assessment/questions`
- `GET /api/v1/assessment/sessions/:id`
- `POST /api/v1/assessment/sessions/:id/answers`
- `POST /api/v1/assessment/sessions/:id/evaluate`

All routes require authenticated user access.

## Config

- `llm.enabled`
- `llm.provider`
- `llm.base_url`
- `llm.api_key`
- `llm.question_model`
- `llm.evaluation_model`
- `llm.request_timeout_seconds`
- `assessment.timeout_minutes`

## Storage

- `assessment_sessions`
- `evaluation_audit`

## Tests

Run:

```bash
go test ./internal/assessment
```
