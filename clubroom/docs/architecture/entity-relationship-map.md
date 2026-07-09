# Entity Relationship Map

Validated: 2026-07-06
Purpose: give a fast, human-readable overview of the core entities and how they relate across identity, family, booking, org, development, and trust.

## Canonical Sources

- `docs/backend-api/DATA_MODEL_AND_IDENTIFIERS.md`
- `packages/db/prisma/schema.prisma`

## Core Identity Spine

- `User`
  - canonical human identity
  - may carry multiple roles
  - owns at most one `UserBookingPreference` row for self-booking choices such as `allowBookSelf`
- `UserRoleMembership`
  - binds one user to one or more operating roles
- `CoachProfile`
  - coach-specific business and delivery profile linked to a user
- `AuthSession`
  - session and device-level access context

## Family and Athlete Spine

- `Family`
  - family container for guardian relationships and shared context
- `GuardianChildLink`
  - explicit guardian-to-athlete relationship
- `Athlete`
  - child athlete or self-managed athlete account
  - may optionally link back to a `User`
- sensitive child records
  - medical
  - emergency contacts
  - consent, where replacements create new `ChildConsent` rows and link prior current rows through `supersededById` rather than hard-deleting consent history
  - SEN tags, where profile replacements soft-remove old `ChildSenTag` rows with `deletedAt`/`deletedByUserId` before creating the new current set
  - safeguarding context

## Booking Spine

- `Club`
  - backend-owned organisation record for club and academy-labelled surfaces
  - stores public/private visibility, city/country, and commercial-mode ownership for new club bookings
  - soft-delete removes it from live authority surfaces while preserving linked history
- `HeadCoachTask`
  - backend-owned oversight action for a club coach
  - belongs to one `Club` and target coach `User`
  - may link to a `Booking`, `Athlete`, and `Squad` when raised from completion queues or assigned-squad follow-up
- `HeadCoachStandard`
  - backend-owned oversight checklist/standard for one `Club`
  - appears in head-coach oversight through the same club/squad scope gate as task reads
- `ClubActivity`
  - club-facing schedule read model
  - projects `ClubEvent`, `GroupSession`, and `ClubMatch` into one linked activity surface
  - lets the product express “presentation”, “private squad training”, “club training open to outsiders”, and “fixture/result” without inventing separate UI worlds
- `ClubMatch`
  - backend-owned club fixture and result record
  - can be club-level or linked to a squad
  - staff/admin actors create and record results; active club members read according to club visibility
- `EventAttendance`
  - backend-owned event check-in/presence record
  - belongs to one `ClubEvent` and one checked-in `User`
  - separate from `AttendanceRecord`, which remains booking/group-session athlete development proof
- `CoachingOffering`
  - what is being sold
- `AvailabilityTemplate` and `AvailabilityOverride`
  - when the coach can deliver
- `Booking`
  - one booking between the commercial side and delivery side
- `BookingParticipant`
  - which athlete or guardian context is attached to the booking
- `CoachAthleteRosterEntry`
  - explicit coach-athlete roster overlay for status, tags, focus, notification preference, removal history, and undo
  - base roster visibility still derives from backend booking participation; removing a roster entry hides that coach-athlete relationship and preserves athlete, booking, and audit history
- `BookingStatusEvent`
  - append-only booking lifecycle
- `GroupSession`
  - backend-owned group, squad, or club training session
  - `coachUserId` is nullable only while club work is waiting for assignment; registration/payment is blocked until a delivery coach is assigned
- `SessionRsvp`
  - parent/athlete attendance intent for a `GroupSession`
  - belongs to one `User`, may be child-scoped to one `Athlete`, and is separate from registration/payment/attendance proof
- `Invite` / `InviteTarget`
  - session-invite authority and target response state
  - `Invite` owns social invite RSVP response metadata in the current route adapter; each response belongs to one `User` and may be child-scoped to one `Athlete`

## Money Spine

- `Invoice`
  - backend-owned coach payee billing record
  - may link to a booking and can have line items, events, reminders, payment attempts, and reconciler entries
- `PaymentAttempt`
  - backend-owned hosted payment attempt
  - provider is simulated in the current runtime; paid state is confirmed by backend payment-attempt lifecycle, not local app state
- `CoachPayoutMethod`
  - coach-owned simulated payout destination
  - stores display-safe payout details only, such as account last four or masked email
- `CoachWithdrawal`
  - coach-owned simulated payout lifecycle record
  - belongs to one `CoachPayoutMethod`; request/cancel/complete transitions do not move real money
  - non-failed/non-cancelled withdrawals reduce the coach's backend-derived available earnings balance

## Organization Spine

Five relationship lenses matter:

1. membership
2. delivery
3. commercial ownership
4. trust and supervision
5. identity shown to the family

Do not collapse these into one "club owns everything" assumption.

## Development Spine

- `SessionNote`
- `SessionFeedback`
- `Goal`
- `PracticeLog`
- `SelfAssessmentPrompt`
- `SelfAssessmentEntry`
- `SkillAssessment`
- `BadgeAward`
- `DrillAssignment`
- `AssignmentSubmission`
- `Video`
- `VideoAnnotation`

These objects should attach back to a booking, athlete, coach, or session context explicitly.
`Goal.progress` is a nullable manual percentage override; when it is null, progress is derived from milestone completion or completed status.
`PracticeLog` records self-reported athlete practice minutes by athlete, author, and day. It is separate from private journaling and uses athlete health read/write gates in the API.
`SelfAssessmentPrompt` and `SelfAssessmentEntry` record athlete/guardian self-assessment prompts and submissions against completed booking proof. Prompts attach to athlete, coach, and booking context; entries derive coach ownership from the booking and use athlete health gates plus audit events in the API.
`DrillAssignment` attaches coach-assigned practice work to one athlete and one coach; `AssignmentSubmission` records athlete completion proof against that assignment. API-mode practice-task reads derive from these rows. Completion writes set assignment status and create or retract submission proof; due-date update, snooze, and recovery checkpoints write `DrillAssignment.dueDate`. Review and follow-up action state is intentionally lightweight and derives from `AuditEvent` rows for the assignment. Feedback-homework synthesis is represented by deterministic `Drill` and `DrillAssignment` rows keyed from the `SessionFeedback` id; add a dedicated homework table only if future homework needs fields that do not fit those entities.

## Trust and Ops Spine

- `AccessGrant`
- `CoachVerification`
- `SafeguardingIncident`
- `AuditEvent`
- `SecurityEvent`
- `DataDeletionRequest`
- `RetentionRun`

These are not optional side tables. They define whether Clubroom is safe to operate.
API-mode coach/athlete concerns are a compatibility view over `SafeguardingIncident` plus append-only `SafeguardingIncidentAction` rows, not a separate live concern table.

## Practical Build Rule

When adding or changing a core entity:

1. update the schema or source contract
2. update the service facade or repository boundary
3. update any route or permission assumptions
4. update the relevant deep source doc if the relationship meaning changed

Extra rule for club-facing schedule work:

- start from `ClubActivity` for read surfaces
- treat RSVP, registration, and booking as participation behaviors on that activity, not as separate top-level club products
- do not project `ClubEvent` into `SessionOffering` or booking flows; if an activity needs registration/payment authority, model the bookable part as `GroupSession` and expose it through `ClubActivity`
- group-session API read models carry resolved coach/club display labels for UI copy; IDs remain authority, labels are presentation metadata only

## Validation Notes

- The deep relationship truth is split across backend docs, Prisma schema, shared contracts, and club governance code.
- This file is intentionally an index and condensed map, not a replacement for those sources.
