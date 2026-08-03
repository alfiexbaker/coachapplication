# Coach health privacy projection — 2026-08-03

Scope: `ROUTE-110` (`/roster/[athleteId]/health`) and its injury API boundary.

Finding: the client labelled every API injury as coach-shared while the API had no stored sharing flag, so a verified assigned coach could receive a family's private injury note.

Fix:

- Added `AthleteInjury.sharedWithCoach`, with a migration default of `false` for existing and future records.
- Returned the flag through the shared contract and persisted it in both seed and Prisma repositories.
- Filtered coach list projections and denied direct read/update of a private injury, while preserving self and guardian access.
- Passed the existing health-form sharing choice to API create/update requests.
- Preserved `UNAUTHORIZED` and `NOT_FOUND` service errors in the coach health hook so terminal access states cannot offer a retry.
- Converted malformed injury payloads from raw Zod 500s to safe audited 400s.

Verification, all local and non-destructive:

- `npm run typecheck` in `apps/api` — passed.
- Root `npm run typecheck`, `npm run test:compile`, and `coach-athlete-health-authority-boundary.test.ts` — passed.
- `NODE_ENV=test API_DATA_BACKEND=seed ./node_modules/.bin/tsx --test src/modules/family-athlete/injury-read-authority.routes.test.ts` — 2/2 passed: verified coach sees the shared injury only; private detail and update return 403; both denials are audited.
- `NODE_ENV=test API_DATA_BACKEND=seed ./node_modules/.bin/tsx --test --test-name-pattern='creates, lists, and updates injuries' src/modules/family-athlete/routes.test.ts` — passed: invalid create/update payloads return audited 400s; valid creation persists the explicit `sharedWithCoach` choice; lifecycle succeeds.
- `DATABASE_URL=… npm run prisma:validate --prefix packages/db` and `npm run audit:db:migrations` — passed; the migration audit reports 0 missing RLS findings.
- Focused ESLint reported 0 errors. Its 3 remaining warnings are pre-existing in `family-athlete-repository.ts`; React Doctor's only error remains the untouched `hooks/use-group-session.ts` working-tree change.

Native iOS semantic retest remains blocked by `ENV-009`; no production, staging, Supabase, or Sentry state changed.
