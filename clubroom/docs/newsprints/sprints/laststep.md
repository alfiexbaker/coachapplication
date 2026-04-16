# Last Step Handoff

Date: 2026-04-16

## What Was Just Done

1. Finished the first `PROD-DB-01` slice by checking in a Prisma baseline migration under `packages/db/prisma/migrations/20260416143000_initial_release_baseline`.
2. Tightened `apps/api/src/lib/ops-runtime.ts` so release preflight verifies a real migration structure instead of only checking for a directory.
3. Changed `apps/api/package.json` so `npm --prefix apps/api run release:preflight` now runs under production semantics, and `packages/config/src/env.ts` now defaults `API_DATA_BACKEND` to `db` only in production.
4. Added release-guardrail coverage in `apps/api/src/modules/health/routes.test.ts` proving checked-in migrations clear the migration blocker.
5. Synced the canonical runtime, backend, runtime-mode, test-data, and sprint docs without pretending the remaining seed-only route drift is already fixed.

## Verification Run In This Step

- `DATABASE_URL=postgresql://clubroom:clubroom@localhost:5432/clubroom npm --prefix packages/db run prisma:validate` -> PASS
- `npm --prefix apps/api run typecheck` -> PASS
- `npx tsx --test apps/api/src/modules/health/routes.test.ts` -> PASS (`4/4`)
- `npm --prefix apps/api run test` -> PASS (`72/72`)
- `npm --prefix apps/api run release:preflight` -> FAILS HONESTLY in the current local runtime on real production blockers: missing prod env, missing db connectivity, and missing object-storage config
- `npm run typecheck` -> PASS
- `npm run test:compile` -> PASS
- `git diff --check` -> PASS

## Current State

- The baseline Prisma migration and lock file are now checked in.
- Release preflight now evaluates production defaults instead of dev defaults, so hidden production config gaps surface immediately.
- Production db intent is now encoded in config defaults and release scripts.
- The full db-backed cutover is still not complete: some seed-only routes will still 503 in db mode until they are migrated or explicitly retired.

## Next Exact Action

1. Start `PROD-DB-01B`.
