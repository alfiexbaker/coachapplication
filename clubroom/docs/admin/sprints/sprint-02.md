# Sprint 02 - Support Console and User 360 (Read-Safe)

## Goal
Give support workers a safe, unified customer view without granting unrestricted access
to sensitive data.

## Dependencies
- Sprints 00-01
- Core domain read models (bookings, messages, family, verification)

## Scope
- user 360 page (profile, roles, bookings, sessions, recent support interactions)
- support inbox queue with SLA timers and ownership states
- cross-entity search (user, booking, invite, verification case)
- safe redaction/masking for medical/safeguarding/private notes by role
- support note timeline attached to case IDs

## Codebase Alignment Anchors
- `app/manage/index.tsx`
- `app/manage/bookings.tsx`
- `app/(tabs)/bookings/**`
- `app/verification/**`

## Data Model (new)
- `support_cases`
- `support_case_assignments`
- `support_case_notes`
- `support_saved_views`

## API Contracts (examples)
- `GET /v1/admin/support/queue`
- `POST /v1/admin/support/cases/:id/assign`
- `GET /v1/admin/users/:userId/360`
- `GET /v1/admin/search?q=`
- `POST /v1/admin/support/cases/:id/notes`

## Security Notes
- sensitive fields guarded by policy scopes + data masking layer
- no bulk export endpoint in this sprint
- every sensitive read writes audit event with reason/case ID
- repository filters required for list/search endpoints

## Test Gates
- role-specific field masking tests
- search/list data-leak tests for non-permitted scopes
- case assignment race-condition/idempotency tests
- audit assertions for profile and sensitive read endpoints

## Exit Criteria
- support workers can resolve common customer issues from one console
- sensitive data is only visible with explicit scopes and auditable reads

