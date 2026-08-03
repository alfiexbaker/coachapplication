# Club calendar authority verification

## Scope

`ROUTE-046` covers `app/club/[clubId]/calendar.tsx`, `hooks/use-club-calendar.ts`, the calendar projections in `services/club-service.ts`, and existing Fastify schedule and squad-list routes. This was a local source and isolated-seed-Fastify audit. No staging or production request or mutation was made.

## Findings fixed

- A missing or malformed calendar route silently displayed an empty calendar. The hook now returns a retryable invalid-link error instead of pretending the club has no activity.
- The calendar frame key omitted actor identity. A later account could retain the former account's club calendar while its own request resolved. The key and refresh dependencies now include the signed-in actor.
- The route declared `section-skeleton` loading but replaced its real calendar geometry with a generic loading state. The header, month navigation, legend, and calendar-grid skeleton now remain mounted; day details and empty copy wait until the requested frame is truthful.

## Authority trace

```text
Club calendar -> useClubCalendar
  -> clubService.getCalendarEvents -> GET /v1/clubs/:clubId/schedule
  -> ClubMembership / club visibility boundary

Club calendar squad filter -> GET /v1/clubs/:clubId/squads
  -> governed club-squad visibility boundary
```

The calendar is a projection only. Fastify authorises both backing reads; the client does not infer visibility from local data.

## Validation

```text
npm run test:compile
# pass

node --require ./scripts/test-register.js --test \
  .tmp-tests/__tests__/hooks/club-calendar-authority-boundary.test.js
# 1 pass; 0 fail

node --require ./scripts/test-register.js --test \
  --test-name-pattern='getCalendarEvents|getCalendarSquads' \
  .tmp-tests/__tests__/services/club-service.test.js
# 3 pass; 29 skipped; 0 fail

npm run typecheck
# pass

npx eslint hooks/use-club-calendar.ts app/club/[clubId]/calendar.tsx \
  __tests__/hooks/club-calendar-authority-boundary.test.ts
# pass; 0 warnings; 0 errors

cd apps/api
NODE_ENV=test API_DATA_BACKEND=seed ./node_modules/.bin/tsx --test \
  --test-name-pattern='returns a unified club schedule for an active member|denies club schedule access to non-members of a private club|allows privileged admins to read club schedules without membership|lists, creates, and updates club squads through governed v1 authority' \
  src/modules/coach-club/routes.test.ts
# 4 pass; 38 skipped; 0 fail
```

The schedule and squad read routes do not currently emit audit events; no audit-read claim is made. The seed squad suite verifies audited write behavior separately but this calendar slice performed no write.

## Explicit limits

- Native iOS interaction, semantic traversal, Dynamic Type, and VoiceOver remain blocked by `ENV-009` CoreSimulator XPC installation failure.
- Direct Supabase per-flow RLS verification remains unavailable under `ENV-003`.
- Sentry issue and event reads remain unavailable under `ENV-004`.
