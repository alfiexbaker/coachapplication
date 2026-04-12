# Last Step Handoff

Date: 2026-04-12

## What Was Just Done

1. Finished `SCHEDULE-API-01` by adding `GET /v1/clubs/:clubId/schedule` in the API and projecting club events plus group sessions into the club-facing activity list.
2. Switched non-mock `services/club-schedule-service.ts` to read club schedules from the new `/v1` route instead of assembling them directly in the app.
3. Added route coverage for member access, non-member denial, and privileged-admin access.
4. Synced the canonical runtime and API docs so the route is no longer described as only planned.

## Verification Run In This Step

- `npm --prefix apps/api run typecheck` -> PASS
- `npm --prefix apps/api run test` -> PASS (`46/46`)

## Current State

- `SCHEDULE-API-01` is complete in code.
- Dedicated club schedule list reads are now backend-authoritative in non-mock mode.
- Club activity detail authority is still not backend-owned.
- The next queue is now recut around the remaining authority gaps instead of old umbrella sprint labels.

## Next Exact Action

1. Start `FAMILY-API-01`: move family member/account authority onto `/v1/families/:familyId`, `/v1/athletes`, and `/v1/athletes/:athleteId`.
