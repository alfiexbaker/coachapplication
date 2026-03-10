# Sprint 13 - Communications, Notifications, And Handoffs

## Objective

Make org operations believable when bookings change, staff change, or support ownership changes.

## Why This Sprint Exists

The org model breaks in practice if assignments can change but notifications, messages, and handoffs do not reflect that change clearly.

## Scope

1. Define role-aware notification rules for:
   - new org booking
   - reassignment
   - cancellation
   - support issue
2. Make parent-facing communication on coach changes explicit.
3. Make coach-facing communication on reassignment explicit.
4. Decide how threads and message ownership behave after reassignment.
5. Ensure notifications and copy match current finance and trust truth.

## Acceptance Criteria

- key org changes trigger the right notifications
- family communication remains clear when a coach changes
- staff handoffs do not leave ambiguous ownership
- support routing is visible when the org owns the relationship

## Verification

- targeted notification and messaging tests
- targeted booking reassignment smoke
- `npm run typecheck`

## Key Files

- `services/notification-service.ts`
- `services/messaging-service.ts`
- `services/event-bus.ts`
- `hooks/use-bookings.ts`
- `hooks/use-booking-detail.ts`
- booking and chat surfaces
