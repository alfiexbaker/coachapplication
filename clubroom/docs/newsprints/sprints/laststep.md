# Last Step Handoff

Date: 2026-03-18

## What Was Just Done

1. Extended `services/booking/booking-authority-service.ts` with a real `createBooking()` bridge to `POST /v1/bookings`, including actor headers, user and athlete ID normalization, ISO scheduling, and GBP minor-unit price conversion.
2. Rewired `services/booking/booking-crud-service.ts` so non-mock direct booking creation is API-first before mirroring the result into local app storage.
3. Kept the create rule explicit instead of pretending wider authority exists:
   - use `/v1/bookings` only when the signed-in actor is the real `bookedBy` user or a `club_admin`
   - keep delegated or coach-mediated booking creation on the existing local path for now
4. Exposed the API create bridge through `services/booking/index.ts` and added app-side coverage in `__tests__/services/booking/booking-crud-service.test.ts`.
5. Updated runtime docs so `/v1/bookings` is now marked scaffolded and the rule boundary is recorded in the product and architecture docs.

## Verification Run In This Step

- `npm run typecheck` -> PASS
- `npm run test:compile` -> PASS
- `npm --prefix apps/api run typecheck` -> PASS
- `node --require ./scripts/test-register.js --test .tmp-tests/__tests__/services/booking/booking-crud-service.test.js .tmp-tests/__tests__/bookings/booking-service.test.js` -> PASS (`38/38`)

## Current State

- Family medical, safeguarding incident creation, direct booking creation, and booking cancel/reopen flows are backend-authoritative in non-mock mode.
- The app still mirrors authoritative booking writes into local storage because booking reads are not fully `/v1`-backed yet.
- The current booking create rule is intentionally narrow:
  - parent or athlete creating for themselves routes through `/v1/bookings`
  - `club_admin` can also route through `/v1/bookings`
  - delegated coach-created bookings for a parent still stay local until backend authz can model actor versus booker cleanly
- `API-01` remains active because delegated booking creation and wider booking read/change flows are not finished.
- The worktree is expected to contain transient untracked audit artifacts under `docs/audits/`.

## Next Exact Action

1. Widen booking authority so delegated flows can move off the local path without lying about who the actor is:
   - invite acceptance
   - linked group-session registration
   - coach-mediated create flows such as counter-offer acceptance
2. After that, move booking reads onto `/v1/bookings` and `/v1/bookings/:bookingId` so the local storage mirror becomes compatibility state instead of the effective source of truth.
