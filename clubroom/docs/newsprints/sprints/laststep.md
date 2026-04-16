# Last Step Handoff

Date: 2026-04-16

## What Was Just Done

1. Finished `PROD-STORAGE-01` by adding `apps/api/src/lib/storage-runtime.ts` as the db-backed upload authority for signed private-bucket upload init.
2. Replaced the db-mode placeholder path in `apps/api/src/modules/wave2plus/routes.ts`; `POST /v1/uploads/init` now persists `MediaObject` and `UploadSession` records, sanitizes storage keys, and returns signed `PUT` upload targets when `API_DATA_BACKEND=db`.
3. Moved object-storage readiness in `apps/api/src/lib/ops-runtime.ts` off the permanent placeholder failure and onto real S3 config blockers.
4. Added focused upload coverage in `apps/api/src/modules/wave2plus/routes.test.ts` for signed db-backed uploads and honest `503` behavior when storage env is missing.
5. Synced the canonical runtime, backend, route-inventory, and sprint docs so the repo no longer claims object storage is still placeholder-only.

## Verification Run In This Step

- `npm --prefix apps/api run typecheck` -> PASS
- `npm --prefix apps/api run test` -> PASS (`71/71`)
- `npm --prefix apps/api run release:preflight` -> FAILS HONESTLY in the current local runtime because the API is still on the seed backend locally and S3 env is not configured
- `npm run typecheck` -> PASS
- `npm run test:compile` -> PASS
- `git diff --check` -> PASS

## Current State

- `PROD-STORAGE-01` is complete in code.
- Db-backed upload init now issues signed private-bucket targets instead of placeholder URLs.
- `/v1/ready` and release preflight now fail on real storage config gaps, not a permanent placeholder flag.
- The release gate is still intentionally red until the API stops releasing on the seed backend and checked-in Prisma migrations exist for the db-backed path.

## Next Exact Action

1. Start `PROD-DB-01`.
