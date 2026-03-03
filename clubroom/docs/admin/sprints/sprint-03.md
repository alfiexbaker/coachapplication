# Sprint 03 - User Lifecycle Controls (Suspend/Reactivate) and Team Membership

## Goal
Implement safe account controls and membership tools needed by operations:
suspend users, restore users, and add/remove users from teams with full auditability.

## Dependencies
- Sprints 00-02
- Club/team domain ownership rules

## Scope
- user suspension with reason codes, durations, and automatic expiry support
- manual unsuspend/reactivate flow with reviewer notes
- soft restrictions (chat-only, booking-only, posting-only)
- add user to team/club/squad and remove user from team
- membership role changes with delegated permission checks
- case-linked enforcement (support, moderation, fraud)

## Data Model (new)
- `user_restrictions`
- `user_restriction_events`
- `team_membership_events`
- `team_membership_invites`

## API Contracts (examples)
- `POST /v1/admin/users/:userId/suspend`
- `POST /v1/admin/users/:userId/reactivate`
- `POST /v1/admin/users/:userId/restrictions`
- `DELETE /v1/admin/users/:userId/restrictions/:restrictionId`
- `POST /v1/admin/teams/:teamId/members`
- `PATCH /v1/admin/teams/:teamId/members/:userId`
- `DELETE /v1/admin/teams/:teamId/members/:userId`

## Security Notes
- suspension/reactivation requires step-up auth + reason code + case link
- support role can request suspension; moderator/security roles approve and execute
- team membership changes must respect delegated club/team ownership policies
- all changes emit immutable audit events and security events

## Test Gates
- unauthorized suspension attempt tests
- conflicting suspension/reactivation concurrency tests
- delegated membership permission tests (allow/deny matrix)
- policy checks for self-action protection (staff cannot self-elevate)

## Exit Criteria
- staff can suspend/reactivate users safely with clear policy controls
- staff can add/remove users to/from teams without bypassing ownership rules
- every lifecycle action is visible in case timeline and audit log

