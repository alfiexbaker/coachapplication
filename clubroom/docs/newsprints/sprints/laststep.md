# Last Step Handoff

Date: 2026-04-12

## What Was Just Done

1. Finished `FAMILY-API-01` by adding scaffolded `GET/POST/PATCH/DELETE /v1/athletes*` support and extending `GET /v1/families/:familyId` so non-mock child profile CRUD runs through the `/v1` family seam.
2. Switched non-mock `services/child-service.ts` off dead `/api/children*` paths and onto `/v1/families/:familyId` plus `/v1/athletes*`, including the live child-delete flow and coach-readable athlete detail lookup.
3. Switched non-mock `services/family/family-member-service.ts` to derive family members, calendar, spending, and overview from authoritative child plus booking reads instead of local family storage.
4. Added route coverage for create, update, delete, outsider denial, and route-state reset so the family seam is testable without cross-test drift.
5. Synced the canonical runtime, service-ownership, route-inventory, and sprint backlog docs.

## Verification Run In This Step

- `npm --prefix apps/api run typecheck` -> PASS
- `npm --prefix apps/api run test` -> PASS (`50/50`)
- `npm run typecheck` -> PASS

## Current State

- `FAMILY-API-01` is complete in code.
- Non-mock family account and child profile authority now use `/v1/families/:familyId` and `/v1/athletes*` instead of local-only family storage or dead `/api/children*` paths.
- Child health authority remains on the existing `/v1/athletes/*` trust routes.
- The next remaining runtime authority gap is coach self-serve ops.

## Next Exact Action

1. Start `COACH-OPS-01`: move coach self-serve profile, availability, and scheduling rules onto `/v1/coaches/me/*`.
