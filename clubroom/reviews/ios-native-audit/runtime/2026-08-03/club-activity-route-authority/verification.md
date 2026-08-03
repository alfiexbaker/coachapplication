# Club activity redirect authority verification

## Scope

`ROUTE-050` covers `app/club/[id]/activity/[activityId].tsx` and the existing club-schedule API boundary. This was a local source and isolated-seed-Fastify audit. No staging or production request or mutation was made.

## Finding fixed

The redirect route had a screen state key with no viewer identity. After an account switch, it could retain the prior actor's successful activity response long enough to redirect the new actor to that activity's target.

The route now includes the current actor in its reload dependencies and cache key, and waits for a truthful frame for that actor before redirecting. Fastify remains the authority for the schedule lookup; it resolves the source activity only after club-membership checks.

## Authority trace

```text
Club activity route -> clubScheduleService.getClubActivity
  -> GET /v1/clubs/:clubId/schedule/:activityId
  -> resolveClubScheduleSource -> ClubMembership + source activity
  -> redirect to event, group session, or match detail
```

The schedule lookup establishes the club boundary. The redirected event, session, and match routes retain their own authorization boundaries.

## Validation

```text
npm run test:compile
# pass

node --require ./scripts/test-register.js --test \
  .tmp-tests/__tests__/hooks/club-activity-route-authority-boundary.test.js
# 1 pass; 0 fail

npm run typecheck
# pass

npx eslint app/club/[id]/activity/[activityId].tsx \
  __tests__/hooks/club-activity-route-authority-boundary.test.ts
# pass; 0 warnings; 0 errors

cd apps/api
NODE_ENV=test API_DATA_BACKEND=seed ./node_modules/.bin/tsx --test \
  --test-name-pattern='returns club event detail for an authorized member|returns group session detail for an authorized member|returns match detail for an authorized member|denies club activity detail to non-members of a private club|returns 404 for a stale club activity id' \
  src/modules/coach-club/routes.test.ts
# 5 pass; 37 skipped; 0 fail
```

The Fastify checks covered event, group-session, and match sources, a private-club non-member denial, and a stale activity ID. The schedule-read route does not currently emit an audit event; no audit-event claim is made for this hand-off read.

`react-doctor --scope changed` has no remaining finding in this route after deleting its unnecessary callback memoization. Its one remaining error is the separately user-owned `hooks/use-group-session.ts:140` compiler limitation and was not changed in this slice.

## Explicit limits

- Native iOS interaction, semantic traversal, Dynamic Type, and VoiceOver remain blocked by `ENV-009` CoreSimulator XPC installation failure.
- Direct Supabase per-flow RLS verification remains unavailable under `ENV-003`.
- Sentry issue and event reads remain unavailable under `ENV-004`.
