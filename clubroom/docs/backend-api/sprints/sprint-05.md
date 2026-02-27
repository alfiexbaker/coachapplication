# Sprint 05 - Bookings, Group Sessions, Invites, RSVPs, and Events

## Goal
Deliver the booking and session core with idempotent writes, optimistic concurrency, and race-safe capacity/waitlist handling.

## Dependencies
- Sprint 04

## Scope
- bookings and participants
- booking objectives (required by product rule)
- booking status history + change requests (cancel/reschedule)
- recurring booking series
- group sessions, registrations, waitlist
- invites and invite targets
- club events and event RSVPs
- attendance records (initial)

## Codebase Alignment Anchors
- `app/book/[coachId]/*`
- `app/(tabs)/bookings/**`
- `app/booking/[id]/cancel.tsx`
- `app/group-sessions/**`
- `app/session/[id]/rsvp.tsx`
- `app/coach-invites.tsx`, `app/invites.tsx`
- `components/ui/booking/*`
- `components/session/rsvp-*`
- `services/booking-service.ts`
- `services/booking/*`
- `services/group-session/*`
- `services/invite/*`
- `services/event/*`

## Tables / Schema
- `bookings`
- `booking_participants`
- `booking_objectives`
- `booking_status_events` (append-only)
- `booking_change_requests`
- `recurring_series`
- `group_sessions`
- `group_session_registrations`
- `waitlist_entries`
- `invites`
- `invite_targets`
- `club_events`
- `event_rsvps`
- `attendance_records`
- `idempotency_keys` (actively used)

## Endpoints (examples)
- `POST /v1/bookings`
- `GET /v1/bookings/:bookingId`
- `PATCH /v1/bookings/:bookingId` (versioned)
- `POST /v1/bookings/:bookingId/cancel`
- `POST /v1/bookings/:bookingId/reschedule-request`
- `POST /v1/group-sessions`
- `POST /v1/group-sessions/:id/register`
- `POST /v1/group-sessions/:id/waitlist`
- `POST /v1/invites/:inviteId/respond`
- `POST /v1/events/:eventId/rsvp`

## AuthZ / Audit Notes
- parent/athlete/coach roles differ by action and booking ownership
- participant and guardian relationships enforced for reads/writes
- idempotency required on all write endpoints listed above
- booking and RSVP actions always audited

## Concurrency / Integrity Notes
- capacity checks and waitlist promotion must be transaction-safe
- version conflicts on mutable booking/session updates
- duplicate invite acceptance and RSVP responses must replay safely

## Test Gates
- duplicate submit/idempotency tests (booking create, RSVP, invite response)
- capacity race tests for group session registration
- authz tests across parent/athlete/coach/club admin
- cancellation/reschedule policy validation tests
- audit event assertions for booking and RSVP actions

## Exit Criteria
- Core booking/session/event flows are correct under retries and concurrency
