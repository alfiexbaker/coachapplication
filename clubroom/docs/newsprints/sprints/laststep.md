# Last Step Handoff

Date: 2026-03-11

## What Was Just Done

1. Added a real dev auth module under `apps/api/src/modules/auth/routes.ts` with `/v1/auth/login`, `/register`, `/refresh`, `/logout`, `/me`, `/check-email`, and profile patching.
2. Added `apps/api/src/lib/dev-auth.ts` so seeded API users can issue and refresh bearer dev-session tokens.
3. Updated `apps/api/src/plugins/auth-placeholder.ts` to accept bearer dev-session tokens while keeping legacy scaffold headers for existing tests.
4. Rewired `services/auth-service.ts` from `/api/auth/*` drift to `/v1/auth/*`, normalized API origin handling, and made API auth checks resolve `/v1/auth/me`.
5. Updated `hooks/use-auth.tsx`, `hooks/use-onboarding.ts`, and auth UI screens so non-mock mode uses real async auth flows instead of local fake sessions.
6. Fixed adjacent verification blockers:
   - narrowed child relationship types to the shared app contract
   - replaced the stale `Routes.clubSetupComplete(...)` call in `hooks/use-create-club.ts`
   - added a proper `unauthorized(...)` API error helper
7. Refreshed backlog and trust/runtime docs so they describe the new auth state accurately.

## Verification Run In This Step

- `npm run typecheck` -> PASS
- `npm run test:compile` -> PASS
- `node --require ./scripts/test-register.js --test .tmp-tests/__tests__/services/auth-service.test.js` -> PASS (`29/29`)
- `npm --prefix apps/api run typecheck` -> PASS
- `npm --prefix apps/api run test` -> PASS (`29/29`)

## Current State

- Frontend auth transport is aligned with the backend `/v1/auth/*` contract for local development.
- API auth is still scaffold-first and seed-backed; it is not production identity yet.
- Sensitive product flows are still not backend-authoritative by default, so `API-01` is now the top backlog item.
- The worktree contains unrelated user changes outside this slice; do not assume a clean tree.

## Next Exact Action

1. Move one sensitive trust flow fully behind `/v1` as the pattern case for `API-01`:
   family/medical data is the highest-value target.
2. Make the app service for that flow backend-authoritative instead of mock-first.
3. Add the same style of route/service verification used here before widening the migration.
