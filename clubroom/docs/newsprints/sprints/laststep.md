# Last Step Handoff

Date: 2026-03-18

## What Was Just Done

1. Added `ReopenBookingRequest` to `packages/shared-contracts/src/booking/contracts.ts` and scaffolded `POST /v1/bookings/:bookingId/reopen` in `apps/api/src/modules/booking/routes.ts`.
2. Extended `apps/api/src/repositories/p0/booking-repository.ts` so seed and db modes both enforce booking ownership before reopening and restore the last active status for upcoming cancelled bookings.
3. Added reopen coverage in `apps/api/src/modules/p0-core/routes.test.ts` and local booking service coverage in `__tests__/services/booking/booking-crud-service.test.ts` plus `__tests__/bookings/booking-service.test.ts`.
4. Extended `services/booking/booking-authority-service.ts` and `services/booking/booking-crud-service.ts` so non-mock reopening uses `/v1` before mirroring the restored booking state into local app storage.
5. Replaced the booking-detail reschedule action with a real reopen action in `hooks/use-booking-detail.ts`, `components/bookings/booking-coach-view.tsx`, `components/bookings/booking-parent-view.tsx`, and `app/(tabs)/bookings/[id].tsx`.
6. Removed dead reschedule-request artifacts and updated runtime docs so the booking lifecycle now points to cancel/reopen instead of reschedule proposals.

## Verification Run In This Step

- `npm run typecheck` -> PASS
- `npm run test:compile` -> PASS
- `npm --prefix apps/api run typecheck` -> PASS
- `npm --prefix apps/api run test` -> PASS (`30/30`)

## Current State

- Family medical, safeguarding incident creation, and booking cancel/reopen flows are backend-authoritative in non-mock mode.
- The backend implementation is still scaffold/in-memory, but the app now uses the `/v1` contract for these trust-critical writes instead of pretending they are local-only.
- `API-01` remains active; booking creation still needs the same backend-authoritative treatment.
- The worktree is expected to contain transient untracked audit artifacts under `docs/audits/`.

## Next Exact Action

1. Rewire direct booking creation through `/v1/bookings` in non-mock mode so `bookingService.createBooking()` is backend-authoritative instead of storage-first.
2. Preserve mock-mode behavior while adding route/service verification before widening backend-authoritative booking creation to invite-acceptance and recurring generation paths.
3. Keep the booking detail UI honest by avoiding any new in-app change-request flow unless there is a real backend contract behind it.
