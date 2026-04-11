# Last Step Handoff

Date: 2026-04-03

## What Was Just Done

1. Finished `BOOK-01` by removing the delegated/local fallback in `services/booking/booking-crud-service.ts`; non-mock booking create now fails closed through `/v1/bookings`.
2. Relaxed the route-level `/v1/bookings` guard in `apps/api/src/modules/booking/routes.ts` so repository authz, not a premature `bookedByUserId === auth user` check, decides whether a guardian/delegated create is allowed.
3. Added the API regression in `apps/api/src/modules/p0-core/routes.test.ts` proving a linked guardian can create a booking when `bookedByUserId` is the linked athlete user instead of the authenticated parent.
4. Synced the canonical runtime, trust, booking-route, service-ownership, and sprint docs to match the new fail-closed authority seam.

## Verification Run In This Step

- `npm run typecheck` -> PASS
- `npm run test:compile` -> PASS
- `npm --prefix apps/api run typecheck` -> PASS
- `npm --prefix apps/api run test` -> PASS (`41/41`)

## Current State

- `AUTH-02`, `TRUST-01`, and `BOOK-01` are complete in code.
- Child medical, emergency-contact, and consent records now belong to the health/emergency store plus `/v1/athletes/*`, not the child-profile object.
- Direct booking creation in non-mock mode now depends on `/v1/bookings`; the app no longer writes a shadow local-only booking when backend authz rejects a guardian/delegated request.
- The next backlog item is now `OBS-01`.

## Next Exact Action

1. Start `OBS-01`: wire Sentry across Expo native, Expo web, and `apps/api`, and fix the current Expo web validation blocker while doing so.
