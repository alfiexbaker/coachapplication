# Sprint 13 - Wave 1 P0 Endpoint Implementation (Executed)

## Goal
Ship the first REST endpoint wave (`P0`) against linked marketplace fixtures so coach/parent/athlete core journeys are API-backed.

## Status
- Completed on: `2026-03-03`
- API package: `/Users/tubton/Desktop/coachapplication/clubroom/apps/api`
- Validation: `npm run typecheck` and `npm test` passed in `apps/api`

## Delivered endpoints
1. `GET /v1/me`
2. `GET /v1/families/:familyId`
3. `GET /v1/athletes/:athleteId/emergency-contacts`
4. `PATCH /v1/athletes/:athleteId/emergency-contacts`
5. `GET /v1/athletes/:athleteId/medical`
6. `PATCH /v1/athletes/:athleteId/medical`
7. `GET /v1/coaches/me/profile`
8. `GET /v1/coaches/me/offerings`
9. `GET /v1/coaches/me/verifications/:type/documents`
10. `GET /v1/clubs`
11. `GET /v1/bookings`
12. `POST /v1/bookings`
13. `GET /v1/group-sessions`
14. `POST /v1/invites/:inviteId/respond`
15. `POST /v1/events/:eventId/rsvp`

## Implementation notes
- Runtime fixture source: `/Users/tubton/Desktop/coachapplication/clubroom/docs/backend-api/test-data/marketplace/linked-dataset.json`
- Shared seed runtime store added at:
  `/Users/tubton/Desktop/coachapplication/clubroom/apps/api/src/lib/marketplace-seed-store.ts`
- New route modules:
  - `/Users/tubton/Desktop/coachapplication/clubroom/apps/api/src/modules/identity/routes.ts`
  - `/Users/tubton/Desktop/coachapplication/clubroom/apps/api/src/modules/coach-club/routes.ts`
  - `/Users/tubton/Desktop/coachapplication/clubroom/apps/api/src/modules/booking/routes.ts`
- Existing family module expanded:
  `/Users/tubton/Desktop/coachapplication/clubroom/apps/api/src/modules/family-athlete/routes.ts`

## Tests added
- `/Users/tubton/Desktop/coachapplication/clubroom/apps/api/src/modules/p0-core/routes.test.ts`

Coverage includes:
- identity + role/membership resolution
- family aggregate access and forbidden path
- coach profile/offerings/verification/clubs
- booking create + list
- invite response and event RSVP mutation paths

## Traceability update
- `entity-endpoint-map.csv` updated:
  - added priority fields (`priority_tier`, `priority_order`, `implementation_wave`)
  - Wave 1 rows (`priority_order` 1-12) marked `implemented`
