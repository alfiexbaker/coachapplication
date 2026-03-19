# Last Step Handoff

Date: 2026-03-19

## What Was Just Done

1. Removed the dead booking counter-offer workflow by deleting `services/counter-offer-service.ts` and its dedicated tests.
2. Removed the typed event residue for counter-offers and reschedule bargaining from `services/event-bus.ts`.
3. Removed dead booking-change artifacts from shared app contracts and infra:
   - counter-offer and negotiation types from `constants/session-types.ts` and `constants/types.ts`
   - counter-offer, negotiation, and unused reschedule-proposal storage keys from `constants/storage-keys.ts`
   - dead scheduling endpoints from `constants/api-endpoints.ts`
   - stale offline queue mapping from `services/offline-queue.ts`
   - unused reschedule-request notification type and trigger from `constants/notification-types.ts` and `services/notification-trigger.ts`
4. Removed counter-offer demo and diagnostics residue from `services/pre-api-live-mode-service.ts`, `app/development/seed-health.tsx`, and supporting docs.
5. Updated the runtime docs so booking changes are explicitly `cancel` or `reopen`, not fake reschedule negotiation.

## Verification Run In This Step

- `npm run typecheck` -> PASS
- `npm run test:compile` -> PASS
- `node --require ./scripts/test-register.js --test .tmp-tests/__tests__/events/phase1-typed-events.test.js` -> PASS (`5/5`)
- `node --require ./scripts/test-register.js --test .tmp-tests/__tests__/health/phase1-service-hardening-gates.test.js` -> FAIL, but only on pre-existing baseline issues outside this slice:
  - `services/api-client.ts`
  - `services/event/event-rsvp-service.ts`
  - `services/video-service.ts`
  - `services/coach-payment-instructions-service.ts`
  - `services/progress/progress-demo-seed-lazy-service.ts`
  - `services/progress/progress-demo-seed-service.ts`
  - `services/review-sync-service.ts`
  - `services/favourite-service.ts`
  - `services/referral-service.ts`

## Current State

- The booking lifecycle is now intentionally `create`, `cancel`, and `reopen`.
- Counter-offer negotiation is no longer a supported booking-change workflow in the app runtime.
- Direct booking creation is backend-authoritative in non-mock mode when the signed-in actor is the real `bookedBy` user or a `club_admin`.
- Delegated booking creation still remains to be widened for flows that actually belong in the product.
- The worktree is expected to contain transient untracked audit artifacts under `docs/audits/`.

## Next Exact Action

1. Widen backend-authoritative delegated booking creation for the flows that still matter:
   - invite acceptance
   - linked group-session registration
2. After that, move booking reads onto `/v1/bookings` and `/v1/bookings/:bookingId` so the local storage mirror becomes compatibility state instead of the effective source of truth.
