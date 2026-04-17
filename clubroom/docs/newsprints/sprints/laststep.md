# Last Step Handoff

Date: 2026-04-16

## What Was Just Done

1. Added `apps/api/src/modules/coach-club/availability.ts` so coach slot resolution now lives in one backend seam instead of being recomputed separately by booking and invite flows.
2. Added `GET /v1/coaches/:coachId/availability/slots` in `apps/api/src/modules/coach-club/routes.ts`, exposing authoritative non-mock bookable slot reads from the API.
3. Updated `apps/api/src/modules/booking/routes.ts` so direct booking create, direct invite create, and direct invite accept all re-validate slots against the same backend availability resolver before writing.
4. Updated `services/availability-service.ts` so non-mock booking and invite surfaces read `/v1/coaches/:coachId/availability/slots`, while the coach self calendar still reads raw availability without bookability filtering.
5. Added regressions in `apps/api/src/modules/coach-club/routes.test.ts` and `apps/api/src/modules/p0-core/routes.test.ts` covering invite holds, duplicate slot reuse, duplicate booking attempts, and scheduling-rule filtering.

## Verification Run In This Step

- `npx tsx --test apps/api/src/modules/coach-club/routes.test.ts` -> PASS
- `npx tsx --test apps/api/src/modules/p0-core/routes.test.ts` -> PASS
- `npm --prefix apps/api run typecheck` -> PASS
- `npm --prefix apps/api run test` -> PASS (`77/77`)
- `npm run typecheck` -> PASS
- `npm run test:compile` -> PASS
- `git diff --check` -> PASS

## Current State

- Non-mock slot authority for booking and direct invites now sits behind one backend resolver instead of client storage math.
- Booking and invite writes now fail closed when a slot is outside the coach window, already booked, or still held by a pending invite.
- The coach self availability calendar still shows raw availability rather than hiding slots behind booking-policy filters.
- The remaining db cutover risk is narrower again: coach-self profile/offerings persistence, group-session authority, and community/media surfaces still carry seed-backed runtime drift.

## Next Exact Action

1. Start `PROD-DB-01B2B`.
