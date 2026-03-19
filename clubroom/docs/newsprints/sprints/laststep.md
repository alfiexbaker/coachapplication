# Last Step Handoff

Date: 2026-03-19

## What Was Just Done

1. Added backend booking read authority for both list and detail flows.
2. Added `GET /v1/bookings/:bookingId` in `apps/api/src/modules/booking/routes.ts` and repository support in `apps/api/src/repositories/p0/booking-repository.ts`.
3. Extended `services/booking/booking-authority-service.ts` with `/v1` booking list/detail reads.
4. Rewired `services/booking/booking-crud-service.ts` so `list()` and `getBooking()` are API-first in non-mock mode, then mirror the authoritative record back into local storage.
5. Updated the runtime docs to reflect that the local booking store is now a mirror for read paths, not the authority.

## Verification Run In This Step

- `npm run typecheck` -> PASS
- `npm run test:compile` -> PASS
- `npm --prefix apps/api run test` -> PASS (`31/31`)
- `node --require ./scripts/test-register.js --test .tmp-tests/__tests__/services/booking/booking-crud-service.test.js .tmp-tests/__tests__/bookings/booking-service.test.js` -> PASS (`40/40`)
- `git diff --check` -> PASS

## Current State

- The booking lifecycle is now intentionally `create`, `cancel`, and `reopen`.
- Counter-offer negotiation and invite countering are no longer supported booking-change workflows in the runtime product surface.
- Booking reads are now API-first in non-mock mode through `/v1/bookings` and `/v1/bookings/:bookingId`.
- Local booking storage still exists, but only as a compatibility mirror for app surfaces that have not been rewritten yet.
- The remaining booking-authority seam is the broader session-invite app model and invite-mediated booking flows.
- The worktree is expected to contain transient untracked audit artifacts under `docs/audits/`.

## Next Exact Action

1. Align the broader session-invite surface to backend data instead of keeping a separate app-first read model.
2. After that, decide whether invite-mediated booking create/change flows should widen backend authz or be narrowed out of the product.
