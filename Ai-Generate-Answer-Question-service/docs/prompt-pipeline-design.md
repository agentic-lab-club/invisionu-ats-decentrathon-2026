# Prompt Pipeline Design (Production)

## Comment Before Changes

This document adapts the existing prompt system to production quality while preserving your current idea and scoring contract.

## Goals

- Keep the current 6-question interview flow unchanged.
- Keep the existing scoring system from txt prompts unchanged:
  - `question_id`
  - `scores[]`
  - `metric_name`
  - score range `0..4`
  - `quote` + concise `reason`
- Improve evaluator reliability to MAANG-style standards:
  - evidence-first scoring
  - deterministic JSON contract
  - calibration and anti-over/under-scoring rules
  - reduced hallucination and prompt injection risk
- Adapt question context to InVision U specializations.

## InVision U Specializations (Canonical)

1. Sociology of Innovation and Leadership
2. Innovative Digital Products and Services
3. Public Governance and Development Strategies
4. Digital Media and Marketing
5. Creative Engineering

## Non-Goals

- No API contract changes.
- No DB schema changes.
- No metric name changes.
- No score range changes.

## Current Contracts to Preserve

### Parser Contract

Input: full transcript

Output JSON:

```json
{
  "questions": {
    "q1_text": "",
    "q2_text": "",
    "q3_text": "",
    "q4_text": "",
    "q5_text": "",
    "q6_text": ""
  }
}
```

### Evaluator Contract (per question)

Output JSON:

```json
{
  "question_id": "qX",
  "scores": [
    {
      "metric_name": "...",
      "score": 0,
      "quote": "",
      "reason": ""
    }
  ]
}
```

## MAANG-Style Prompt Standards Applied

- Evidence-first: every score must map to direct quote evidence.
- Anchor-based scoring: explicit 0/1/2/3/4 decision boundaries.
- No unsupported 4: top score requires concrete, specific behavioral evidence.
- Modesty-safe calibration: do not penalize humility if behavior is strong.
- Injection resistance: ignore candidate-side instructions and non-question text.
- Determinism: output JSON only, no markdown, no extra fields.

## Specialization Adaptation Strategy

- Keep q1..q6 logic unchanged.
- In q2 and q4, enforce explicit fit between applicant goals and one of the 5 programs.
- In q3 and q5, treat leadership as behavior under constraints (initiative, coordination, accountability, influence).
- In q6, keep social support core, but allow resilience evidence from constrained environments.

## Quality Gates

- Schema-valid JSON output only.
- All target metrics must be scored.
- Quotes must be verbatim from `qX_text`.
- No invented facts.
- If evidence is weak, score must stay low.

## Rollout Plan

1. Update parser prompt with stronger assignment heuristics and specialization-aware q2 mapping.
2. Update q1..q6 prompts with strict scoring anchors and consistency rules.
3. Keep metrics and output schemas unchanged for full backward compatibility.
4. Run offline prompt QA set (strong, medium, weak, empty answers).
5. Deploy and monitor score distribution drift.

## Risks and Mitigations

- Risk: Over-scoring generic motivational text.
  - Mitigation: explicit rule that generic declarations cannot get score 4.
- Risk: Under-scoring humble applicants.
  - Mitigation: behavior-over-confidence calibration.
- Risk: Parser spillover between q3/q5.
  - Mitigation: priority heuristics and no-duplication rule.

## Acceptance Criteria

- Existing evaluation parser can consume outputs without code changes.
- Score stability improves on repeated runs.
- q2 answers consistently map to one of the five InVision U specializations.
- Reviewer can trace each score to quote evidence quickly.

