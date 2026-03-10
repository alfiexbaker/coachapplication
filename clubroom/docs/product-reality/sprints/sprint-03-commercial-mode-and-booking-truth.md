# Sprint 03 - Commercial Mode And Booking Truth

## Objective

Turn org commercial mode from planning into real runtime truth for new org bookings.

## Why This Sprint Exists

The org model is not believable until the owner can set the commercial rule and the booking flow shows the consequence clearly.

## Scope

1. Add a `Commercial` section to the current club settings surface.
2. Make the control `OWNER` only in V1.
3. Keep `ADMIN` and `HEAD_COACH` read-only for this setting in V1.
4. Persist `commercialMode` through the same club data path the runtime already uses.
5. Add a confirmation step before changing commercial mode.
6. Make the change prospective only:
   - existing bookings keep their stored truth
   - new org-created sessions and bookings use the new mode
7. Expand booking detail and summary surfaces so they consistently show:
   - `Booked with`
   - `Delivered by`
   - `Billing handled by`
   - `Support handled by`
8. Keep money copy honest:
   - no payout or processor claims
   - only billing responsibility and reconciler truth

## Acceptance Criteria

- owner can change commercial mode in the live settings path
- non-owner staff can see the mode but cannot edit it
- booking truth is visible beyond the review/confirmation steps
- existing bookings do not get silently rewritten when the mode changes
- the copy does not imply real in-app payouts

## Verification

- targeted test for commercial mode persistence
- targeted test for owner-only edit access
- targeted booking detail test for org-owned vs coach-owned wording
- `npm run typecheck`

## Key Files

- `app/club/settings.tsx`
- `hooks/use-club-settings.ts`
- `services/social-feed-service.ts`
- `hooks/use-bookings.ts`
- `hooks/use-booking-detail.ts`
- `components/bookings/*`

## Output

At the end of this sprint, the app can answer the first commercial question clearly:

- "When I book this org session, who am I actually booking with?"
