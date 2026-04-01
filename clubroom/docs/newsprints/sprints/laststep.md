# Last Step Handoff

Date: 2026-04-02

## What Was Just Done

1. Replaced `apps/api/src/plugins/auth-placeholder.ts` with bearer-first `apps/api/src/plugins/auth-context.ts`.
2. Removed runtime fallback to `x-auth-user-id` and `x-auth-roles`; header-based auth override now exists only through the API test harness, while `apps/api/src/server.ts` disables it for the actual runtime server.
3. Added `services/api-auth-context.ts` and moved the app's `/v1` authority services off client-supplied identity headers so they now rely on bearer auth plus `x-acting-role` and scoped relationship headers.
4. Added an auth regression test that proves scaffold headers are rejected when runtime header override is disabled, and updated the remaining session test expectation for the explicit test-override session id.
5. Synced the canonical auth/runtime docs and sprint backlog so the repo truth matches the new bearer-first path.

## Verification Run In This Step

- `npm run typecheck` -> PASS
- `npm run test:compile` -> PASS
- `npm --prefix apps/api run typecheck` -> PASS
- `npm --prefix apps/api run test` -> PASS (`40/40`)

## Current State

- `AUTH-02` now has a stable bearer-first implementation path in the real app/server runtime.
- The API is still using temporary dev-session auth rather than production JWT validation, but the silent scaffold-header runtime bypass is gone.
- Frontend `/v1` authority calls now fit the app architecture better because `services/api-client.ts` owns bearer transport and the feature services only add acting-role or relationship scope hints when needed.

## Next Exact Action

1. Continue `AUTH-02` by replacing the temporary dev-session bearer model in `apps/api/src/plugins/auth-context.ts` with production JWT validation and non-seed session backing.
2. With the runtime auth path stabilized, split the follow-through into `TRUST-01`, `BOOK-01`, and `OBS-01` so the remaining authority seams and observability can land before launch-surface polish.
