# Last Step Handoff

Date: 2026-04-03

## What Was Just Done

1. Finished `TRUST-01` by removing child-profile ownership of medical, emergency-contact, and consent writes in `services/child-service.ts`.
2. Routed those trust-sensitive writes through `services/safety-service.ts` so mock mode now persists them in the emergency store and non-mock mode sends them through `services/family/family-health-service.ts` to `/v1/athletes/*`.
3. Updated child-profile reads to hydrate health data from the safety path instead of trusting stale embedded child-profile fields.
4. Changed `app/(modal)/edit-child-profile.tsx` and `hooks/use-edit-child-profile.ts` so the modal only edits profile fields and routes parents into the dedicated child medical and emergency screens for protected health changes.
5. Synced the canonical source-of-truth, trust-boundary, service-ownership, and sprint docs to match the new ownership boundary.

## Verification Run In This Step

- `npm run typecheck` -> PASS
- `npm run test:compile` -> PASS

## Current State

- `AUTH-02` and `TRUST-01` are complete in code.
- Child medical, emergency-contact, and consent records now belong to the health/emergency store plus `/v1/athletes/*`, not the child-profile object.
- The next backlog items are now `BOOK-01` and `OBS-01`.

## Next Exact Action

1. Start `BOOK-01`: remove delegated booking-create fallback paths that still allow local-only writes outside the backend authority seam.
2. Start `OBS-01`: wire Sentry across Expo native, Expo web, and `apps/api`, and fix the current Expo web validation blocker while doing so.
