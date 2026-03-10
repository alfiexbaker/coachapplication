# Sprint 17 - Booking Lifecycle And Parent Operations

## Objective

Make the parent experience believable after the initial booking is made.

## Why This Sprint Exists

A complete coach/user-first POC is not only about discovery and checkout. Parents need the rest of the lifecycle to feel real:

- cancellation
- rescheduling
- support
- issue handling
- confidence after changes

## Scope

1. Audit the parent booking detail and post-booking lifecycle.
2. Tighten reschedule, cancel, and rebook flows.
3. Make issue reporting and support routing clear in org and coach-owned contexts.
4. Make family operations realistic for multiple children where relevant.
5. Ensure parent lifecycle copy remains consistent with commercial ownership and delivery ownership.

## Acceptance Criteria

- parents can understand what to do after booking
- cancel, reschedule, and rebook flows feel like one system
- support and issue-routing copy is clear
- the lifecycle remains believable when coach assignment changes

## Verification

- targeted booking detail and cancellation tests
- targeted parent booking smoke
- `npm run typecheck`

## Key Files

- `app/(tabs)/bookings/[id].tsx`
- `app/booking/[id]/cancel.tsx`
- `hooks/use-booking-detail.ts`
- cancellation and support-related services/components
