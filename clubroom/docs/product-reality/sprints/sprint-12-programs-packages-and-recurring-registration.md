# Sprint 12 - Programs, Packages, And Recurring Registration

## Objective

Make the org offer structure believable beyond one-off bookings.

## Why This Sprint Exists

A complete POC for coaching organizations needs recurring and program-based selling, not only single session creation.

## Scope

1. Define the first believable org offer types:
   - one-off sessions
   - recurring programs
   - group/cohort offers
2. Tighten recurring booking and registration UX around the org model.
3. Make capacity, seat availability, and waitlist behavior explicit where needed.
4. Ensure parent-facing registration copy matches commercial ownership.
5. Keep delivery assignment and org ownership visible on program-based work.

## Acceptance Criteria

- orgs can present more than ad hoc one-off sessions
- recurring registration feels intentional, not bolted on
- families understand what they are joining and who owns it
- org-owned and coach-owned program offers stay commercially clear

## Verification

- targeted recurring booking tests
- targeted smoke for session/program creation and registration
- `npm run typecheck`

## Key Files

- `app/sessions/create.tsx`
- `hooks/use-create-session.ts`
- `services/recurring-booking-service.ts`
- `services/group-session-service.ts`
- `app/book/[coachId]/*`
