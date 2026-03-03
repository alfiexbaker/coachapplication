# Sprint 05 - Moderation and Safeguarding Operations

## Goal
Provide case management tools for moderation and safeguarding incidents,
including evidence handling, assignment, and escalation.

## Dependencies
- Sprints 00-04
- Trust/Ops APIs in backend Sprint 10

## Scope
- moderation queue for posts/comments/messages/reports
- safeguarding incident board with severity lanes and ownership
- evidence bundle viewer (attachments, timeline, linked actions)
- action set: warn, mute, restrict, suspend, escalate to safeguarding lead
- appeals queue and reversal workflow

## Data Model (new)
- `moderation_cases`
- `moderation_case_evidence`
- `moderation_actions`
- `appeals_cases`

## API Contracts (examples)
- `GET /v1/admin/moderation/queue`
- `POST /v1/admin/moderation/cases/:id/actions`
- `GET /v1/admin/safeguarding/incidents`
- `POST /v1/admin/safeguarding/incidents/:id/assign`
- `POST /v1/admin/appeals/:id/resolve`

## Security Notes
- safeguarding cases require assignment-based access and strict audit
- privileged content visibility is limited by case scope
- evidence integrity checks (hash + source metadata)
- legal hold flags automatically applied on severe safeguarding categories

## Test Gates
- moderation action authorization matrix tests
- safeguarding assignment and access boundary tests
- evidence tamper-check and missing-attachment error tests
- appeal reversal audit coverage tests

## Exit Criteria
- moderation and safeguarding actions are policy-driven and traceable
- escalation paths are defined and test-covered

