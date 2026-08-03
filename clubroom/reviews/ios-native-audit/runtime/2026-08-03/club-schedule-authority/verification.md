# Club schedule authority verification

## Scope

`ROUTE-051` covers `app/club/[id]/schedule.tsx`, `components/club/ClubScheduleScreen.tsx`, `hooks/use-club-schedule.ts`, and the existing club schedule, event, and match Fastify boundaries. This was a local source and isolated-seed-Fastify audit. No staging or production request or mutation was made.

## Findings fixed

- The schedule did not key its `useScreen` frame by actor. A changed account could retain the prior account's schedule and controls while the next request was resolving. The data key now includes actor, club, and squad identity.
- API-mode context compared an API canonical membership ID to the app-local user ID. `GET /v1/clubs` already supplies only the signed-in viewer's membership, so the extra comparison could hide real controls. The selected club membership is now used directly.
- One training-session capability guarded all three controls. That wrongly hid event and match creation from active event/match staff, including assistants. Training remains governed by `create_org_sessions`; event and match controls now follow Fastify's active-staff/privileged capability exposed as `canManageMatches`.

## Authority trace

```text
Club schedule -> useClubSchedule
  -> GET /v1/clubs/:clubId/schedule -> ClubMembership read boundary
  -> GET /v1/clubs -> viewer membership + canManageMatches
  -> Event / Training / Match create controls

Event create -> Fastify club-event staff/admin boundary -> AuditEvent
Training create -> club create_org_sessions capability -> session boundary
Match create -> Fastify active-staff/admin boundary -> AuditEvent
```

The client only decides whether to expose a completion path. Fastify remains authoritative for the schedule read and every create request.

## Validation

```text
npm run test:compile
# pass

node --require ./scripts/test-register.js --test \
  .tmp-tests/__tests__/hooks/club-schedule-authority-boundary.test.js \
  .tmp-tests/__tests__/hooks/club-schedule-create-context.test.js \
  .tmp-tests/__tests__/hooks/create-event-club-context.test.js
# 3 pass; 0 fail

npm run typecheck
# pass

npx eslint hooks/use-club-schedule.ts components/club/ClubScheduleScreen.tsx \
  __tests__/hooks/club-schedule-authority-boundary.test.ts
# pass; 0 warnings; 0 errors

cd apps/api
NODE_ENV=test API_DATA_BACKEND=seed ./node_modules/.bin/tsx --test \
  --test-name-pattern='returns a unified club schedule for an active member|keeps training-named club events separate from group sessions in club schedule|keeps non-RSVP club events info-only in club schedule|denies club schedule access to non-members of a private club|allows privileged admins to read club schedules without membership|persists club matches, gates staff writes, and projects results into club schedule|derives fixture management UI capability from club authority|creates, publishes, invites, and cancels club events through v1 authority' \
  src/modules/coach-club/routes.test.ts \
  src/modules/coach-club/club-match-capability.test.ts \
  src/modules/p0-core/routes.test.ts
# 8 pass; 81 skipped; 0 fail
```

`create-match-api-boundary.test.ts` was also run alongside the front-end context checks. Its fourth assertion is an existing stale exact-source expectation in `hooks/use-matches-screen.ts`, which this slice did not change; the schedule, event-context, and new authority checks passed.

The schedule-read route does not emit an audit event today. The event and match write tests asserted their backend audit behavior; no schedule-read audit claim is made.

## Explicit limits

- Native iOS interaction, semantic traversal, Dynamic Type, and VoiceOver remain blocked by `ENV-009` CoreSimulator XPC installation failure.
- Direct Supabase per-flow RLS verification remains unavailable under `ENV-003`.
- Sentry issue and event reads remain unavailable under `ENV-004`.
