# Last Step Handoff

Date: 2026-04-12

## What Was Just Done

1. Finished `SCHEDULE-API-02` by adding `GET /v1/clubs/:clubId/schedule/:activityId` with the same access boundary as the club schedule list route.
2. Extended `services/club-schedule-service.ts` so non-mock club activity reads now resolve through the new `/v1` detail route, while mock mode still projects locally.
3. Added one canonical app route for club activities and a thin resolver screen that forwards into the existing event, session, or match detail screens from authoritative backend detail.
4. Removed app-side source guessing from the club schedule surfaces so schedule cards no longer decide drill-ins directly from the raw list row.
5. Synced the canonical runtime, service-ownership, route-inventory, and sprint backlog docs.

## Verification Run In This Step

- `npm --prefix apps/api run typecheck` -> PASS
- `npm --prefix apps/api run test` -> PASS (`60/60`)
- `npm run typecheck` -> PASS
- `npm run test:compile` -> PASS

## Current State

- `SCHEDULE-API-02` is complete in code.
- Non-mock club schedule list and item reads now run through `/v1/clubs/:clubId/schedule*`.
- Club and team schedule surfaces now deep-link through a canonical club activity route, and the resolver screen forwards to the existing event/session/match detail pages.
- Mock mode still projects `ClubActivity` locally by design.

## Next Exact Action

1. Recut the backlog from current runtime truth before starting the next sprint label.
