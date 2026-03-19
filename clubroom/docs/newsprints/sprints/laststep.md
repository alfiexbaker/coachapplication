# Last Step Handoff

Date: 2026-03-19

## What Was Just Done

1. Added shared `/v1` contracts for invite response and group-session registration in `packages/shared-contracts/src/booking/contracts.ts`.
2. Added `POST /v1/group-sessions/:sessionId/register` in `apps/api/src/modules/booking/routes.ts` with guardian/athlete/admin authz, capacity-aware register vs waitlist behavior, and linked booking creation for confirmed registrations.
3. Tightened `POST /v1/invites/:inviteId/respond` so accepted group-session invites now create or reuse the linked registration and booking instead of only flipping invite state.
4. Rewired `services/group-session/session-registration-service.ts` off the old `/api/group-sessions/:id/register` path and onto `/v1/group-sessions/:id/register` in non-mock mode.
5. Removed the live `COUNTERED` session-invite workflow from runtime app surfaces:
   - `services/invite/session-invite-service.ts`
   - `services/invite/index.ts`
   - `constants/session-types.ts`
   - invite/session UI status handling and operations copy
   - legacy relational demo seed data that still pretended countered invites were part of the product

## Verification Run In This Step

- `npm run typecheck` -> PASS
- `npm run test:compile` -> PASS
- `npm --prefix apps/api run typecheck` -> PASS
- `npm --prefix apps/api run test` -> PASS (`31/31`)
- `npm exec tsx -- --test __tests__/services/group-session/session-registration-service.test.ts __tests__/services/invite/session-invite-service.test.ts` -> FAIL, but only because the direct TS runner chokes on the repo’s React Native transform setup (`react-native/index.js` parse failure)
- `node --require ./scripts/test-register.js --test .tmp-tests/__tests__/services/group-session/session-registration-service.test.js .tmp-tests/__tests__/services/invite/session-invite-service.test.js` -> FAIL, but only because the compiled harness still cannot resolve `.tmp-tests/constants/booking-types`
- `git diff --check` -> PASS

## Current State

- The booking lifecycle is now intentionally `create`, `cancel`, and `reopen`.
- Counter-offer negotiation and invite countering are no longer supported booking-change workflows in the runtime product surface.
- Direct booking creation is backend-authoritative in non-mock mode when the signed-in actor is the real `bookedBy` user or a `club_admin`.
- Group-session registration is now backend-authoritative in non-mock mode through `/v1/group-sessions/:sessionId/register`.
- Accepted group-session invites now create their linked backend registration/booking inside `/v1/invites/:inviteId/respond`.
- The remaining booking-authority seam is the broader session-invite app model plus booking reads, not reschedule negotiation.
- The worktree is expected to contain transient untracked audit artifacts under `docs/audits/`.

## Next Exact Action

1. Move booking reads onto `/v1/bookings` and `/v1/bookings/:bookingId` so the local mirror stops acting like the effective source of truth.
2. After that, decide whether to:
   - align the broader session-invite surface to backend data, or
   - cut more invite-era residue such as reschedule settings and dead negotiation UI files if those flows are no longer product-real.
