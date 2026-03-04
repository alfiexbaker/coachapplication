# Sprint 14 - Wave 2/3/4 Endpoint Implementation (Executed)

## Goal
Complete all remaining non-deferred seeded endpoint waves (`P1`, `P2`, `P3`) so every user-facing seeded section is API-backed before database cutover.

## Status
- Completed on: `2026-03-03`
- API package: `/Users/tubton/Desktop/coachapplication/clubroom/apps/api`
- Validation:
  - `cd apps/api && npm run typecheck`
  - `cd apps/api && npm test`
  - Result: pass (`22` tests, `0` failures)

## Delivered endpoints (Wave 2/3/4)
1. `GET /v1/invoices/:invoiceId`
2. `GET /v1/athletes/:athleteId/progress`
3. `GET /v1/athletes/:athleteId/goals`
4. `GET /v1/athletes/:athleteId/badges`
5. `GET /v1/drills`
6. `POST /v1/uploads/init`
7. `GET /v1/videos/:videoId`
8. `GET /v1/community-groups`
9. `GET /v1/posts`
10. `GET /v1/message-threads`
11. `GET /v1/me/notifications`
12. `GET /v1/access-grants`
13. `GET /v1/admin/retention-runs`
14. `GET /v1/me/data-deletion-requests`

Existing safeguarding endpoints remained active in this wave:
- `POST /v1/safeguarding/incidents`
- `GET /v1/safeguarding/incidents/:incidentId`
- `POST /v1/safeguarding/incidents/:incidentId/actions`

Additional debug coverage endpoint:
- `GET /v1/meta/seed-health`

## Implementation notes
- Registered `wave2plus` module in:
  - `/Users/tubton/Desktop/coachapplication/clubroom/apps/api/src/app.ts`
- Revenue endpoint linkage completed in:
  - `/Users/tubton/Desktop/coachapplication/clubroom/apps/api/src/modules/wave2plus/routes.ts`
  - includes `paymentInstructionTemplates` in invoice aggregate
  - enforces invoice and trust/admin access checks
- Seed coverage diagnostics added in:
  - `/Users/tubton/Desktop/coachapplication/clubroom/apps/api/src/modules/meta/routes.ts`
- Runtime cutover control added:
  - env `API_DATA_BACKEND=seed|db`
  - seed-backed endpoints now fail fast with `503 SERVICE_UNAVAILABLE` when set to `db`

## Tests added
- `/Users/tubton/Desktop/coachapplication/clubroom/apps/api/src/modules/wave2plus/routes.test.ts`

Coverage includes:
- role smoke for `coach`, `parent`, `athlete` with non-empty core sections
- invoice, progress/goals/badges, drills, uploads, video, community, messaging, notifications
- trust/ops admin gating and data deletion listing
- seed health counters for edge cases (parents without kids, users without club, coach availability/offering coverage)

## Traceability update
- `/Users/tubton/Desktop/coachapplication/clubroom/docs/backend-api/test-data/marketplace/entity-endpoint-map.csv`
  - all non-deferred tables are now `implemented`
  - status counts:
    - `implemented`: `85`
    - `deferred`: `4`
