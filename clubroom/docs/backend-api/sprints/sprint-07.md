# Sprint 07 - Progress, Session Notes, Goals, Skills, Badges, Drills

## Goal
Implement development/progress APIs with strict visibility controls, explicit sharing for private notes, and stable progress data contracts.

## Dependencies
- Sprint 05 (bookings/session references)
- Sprint 02 (grants/authz kernel)

## Scope
- session notes (public/private)
- session feedback and coach reviews
- goals + milestones
- skill definitions, assessments, rollups
- badges and athlete awards
- drills, assignments, assignment submissions/evidence metadata
- progress timeline entries (materialized or generated)

## Codebase Alignment Anchors
- `app/development/**`
- `app/session-notes/[bookingId].tsx`
- `app/badges/**`, `app/(tabs)/badges.tsx`
- `app/drills/**`
- `components/session/session-notes-*`
- `components/progress/*`
- `components/badges/*`
- `components/drills/*`
- `services/progress-service.ts`
- `services/progress/*`
- `services/drill-service.ts`
- `services/badge-service.ts`
- `services/review-service.ts`

## Tables / Schema
- `session_notes`
- `session_feedback`
- `coach_reviews`
- `goals`
- `goal_milestones`
- `skill_definitions`
- `athlete_skill_assessments`
- `athlete_skill_rollups`
- `badges`
- `athlete_badges`
- `drills`
- `drill_assignments`
- `assignment_submissions`
- `progress_timeline_entries`

## Endpoints (examples)
- `GET/POST/PATCH /v1/session-notes`
- `GET /v1/athletes/:athleteId/progress`
- `GET/POST/PATCH /v1/athletes/:athleteId/goals`
- `POST /v1/athletes/:athleteId/skills/assessments`
- `POST /v1/athletes/:athleteId/badges`
- `POST /v1/drill-assignments`
- `POST /v1/drill-assignments/:id/submissions`

## AuthZ / Audit Notes
- private notes: owner coach only unless explicit coach-to-coach grant
- public notes/feedback: role-filtered views for parent/athlete participants
- sensitive/private note reads audited
- assignment and progress write paths audited where they affect athlete record

## Security / Data Notes
- private notes encrypted at rest (application-level field encryption for selected fields)
- visibility filtering enforced server-side (never trust client role claims)
- idempotency on assignment submissions and badge award actions

## Test Gates
- visibility matrix tests (coach/parent/athlete/shared-coach)
- grant-based private note access tests
- encrypted field round-trip tests
- duplicate badge/assignment submission protections
- audit assertions for private reads and writes

## Exit Criteria
- Development features work with correct data visibility and explicit sharing controls
