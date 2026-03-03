# Sprint 12 - Community and Messaging Safety Operations

## Goal
Add complete internal tooling for messaging/community safety:
content triage, escalation, takedown/restriction actions, and appeals.

## Dependencies
- Sprints 00-11
- Community stack (`services/community/**`, `services/comment-service.ts`, `services/messaging-service.ts`)

## Scope
- content safety queue across posts/comments/messages/group requests
- evidence timeline with message/comment snapshots and moderation history
- moderation actions: hide/remove content, user mute, temporary feature restrictions
- appeals pipeline and reviewer decision workflow
- safeguarding handoff for severe content categories

## Data Model (new)
- `content_safety_cases`
- `content_safety_evidence`
- `content_moderation_actions`
- `content_appeals`
- `content_policy_labels`

## API Contracts (examples)
- `GET /v1/admin/content/queue`
- `GET /v1/admin/content/cases/:id`
- `POST /v1/admin/content/cases/:id/actions`
- `POST /v1/admin/content/cases/:id/escalate`
- `POST /v1/admin/content/appeals/:id/resolve`

## Security Notes
- restricted visibility for sensitive conversations and child-related context
- takedown actions require reason code + policy label
- irreversible actions require step-up auth and second-review for severe categories
- every evidence read and moderation action audited

## Test Gates
- policy label to action mapping tests
- role-based content visibility tests
- appeal reversal integrity tests
- safeguarding escalation trigger tests

## Exit Criteria
- content moderation operates from one governed workflow
- severe safety issues are escalated consistently and auditably

