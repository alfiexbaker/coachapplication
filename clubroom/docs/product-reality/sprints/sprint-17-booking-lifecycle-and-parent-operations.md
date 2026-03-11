# Sprint 17

## Name

Booking Lifecycle And Parent Operations

## Why

Recurring booking already existed, but parent operations still felt incomplete after the initial checkout. Parents needed one place to review weekly plans, understand what pause and cancel really do, and trust that changing a recurring plan would update the future sessions they actually see on the calendar.

## Scope In This Slice

1. Add a parent-facing recurring plan screen under family surfaces.
2. Link recurring-generated bookings back to the parent plan.
3. Make recurring cancellation cancel future generated booking instances.
4. Keep recurring relationship labels readable from real user names instead of raw ids.
5. Add user-story tests for review, pause, resume, and cancel flows.

## Acceptance

- Parents can open a recurring plan list from family calendar and from a recurring-generated booking.
- Parents can see the coach, child, next session, and the effect of pause vs cancel.
- Pausing a recurring plan keeps already-generated future sessions on the calendar.
- Cancelling a recurring plan cancels future generated booking instances.
- The recurring lifecycle has targeted tests that validate the parent stories.

## Out Of Scope

- Coach-facing recurring operations redesign.
- Automated billing or payout behavior.
- Rich editing of recurring cadence beyond pause, resume, and cancel.
