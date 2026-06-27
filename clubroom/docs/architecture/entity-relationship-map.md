# Entity Relationship Map

Validated: 2026-03-11
Purpose: give a fast, human-readable overview of the core entities and how they relate across identity, family, booking, org, development, and trust.

## Canonical Sources

- `docs/backend-api/DATA_MODEL_AND_IDENTIFIERS.md`
- `packages/db/prisma/schema.prisma`
- `docs/product-reality/ORG_RELATIONSHIP_MODEL_2026-03-10.md`
- `docs/product-reality/ORG_PERMISSION_AND_VISIBILITY_MATRIX_2026-03-10.md`

## Core Identity Spine

- `User`
  - canonical human identity
  - may carry multiple roles
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
  - consent
  - safeguarding context

## Booking Spine

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
- `BookingStatusEvent`
  - append-only booking lifecycle

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
- `SkillAssessment`
- `BadgeAward`
- `Video`
- `VideoAnnotation`

These objects should attach back to a booking, athlete, coach, or session context explicitly.

## Trust and Ops Spine

- `AccessGrant`
- `CoachVerification`
- `SafeguardingIncident`
- `AuditEvent`
- `SecurityEvent`
- `DataDeletionRequest`
- `RetentionRun`

These are not optional side tables. They define whether Clubroom is safe to operate.

## Practical Build Rule

When adding or changing a core entity:

1. update the schema or source contract
2. update the service facade or repository boundary
3. update any route or permission assumptions
4. update the relevant deep source doc if the relationship meaning changed

Extra rule for club-facing schedule work:

- start from `ClubActivity` for read surfaces
- treat RSVP, registration, and booking as participation behaviors on that activity, not as separate top-level club products

## Validation Notes

- The deep relationship truth is currently split across backend docs and product-reality docs.
- This file is intentionally an index and condensed map, not a replacement for those sources.
