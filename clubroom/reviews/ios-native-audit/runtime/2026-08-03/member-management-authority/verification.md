# Member management authority verification

## Scope

`ROUTE-048` covers `app/club/[clubId]/member/[memberId].tsx` and `hooks/use-member-management.ts`. The trace was limited to the local app contract and Fastify's isolated seed backend. No staging or production request or mutation was made.

## Finding fixed

`clubAuthorityService.listClubs()` returns only the signed-in viewer's memberships and maps API identities to their canonical form. Member Management then compared that membership ID with the app-local current-user ID. The comparison could fail for a valid owner, admin, or head coach, hiding all allowed controls.

The screen now uses the viewer membership for the selected club directly. Its `useScreen` cache is keyed by signed-in actor, club, and target member, so an account change cannot retain a prior manager frame. The denied-state copy now states the real outcome instead of claiming that every coach can manage members.

## Authority trace

```text
Member route -> useMemberManagement -> clubAuthorityService.listClubs
  -> GET /v1/clubs -> viewerMembership

Role / remove / ban -> clubService -> Fastify coach-club routes
  -> repository assertCanManageTargetRole -> ClubMembership / AuditEvent

Squad change -> clubService -> Fastify squad-member route
  -> require squad assignment context -> ClubMembership / Athlete / SquadMembership / AuditEvent
```

The API allows any active club member to read the non-sensitive member list. Mutations require `manage_staff_and_invites` plus a higher target role; the API records both success and denial audit events. This is a backend boundary, not a frontend trust decision.

## Validation

```text
npm run test:compile
# pass

node --require ./scripts/test-register.js --test \
  .tmp-tests/__tests__/hooks/member-management-authority-boundary.test.js
# 1 pass; 0 fail

npm run typecheck
# pass

npx eslint hooks/use-member-management.ts \
  app/club/[clubId]/member/[memberId].tsx \
  __tests__/hooks/member-management-authority-boundary.test.ts
# pass; 0 warnings; 0 errors

cd apps/api
NODE_ENV=test API_DATA_BACKEND=seed ./node_modules/.bin/tsx --test \
  --test-name-pattern='lists and mutates club members through governed v1 authority|assigns and removes club members from squads through governed v1 authority' \
  src/modules/coach-club/routes.test.ts
# 2 pass; 40 skipped; 0 fail
```

## Explicit limits

- Native iOS interaction, semantic traversal, Dynamic Type, and VoiceOver remain blocked by `ENV-009` CoreSimulator XPC installation failure.
- Direct Supabase per-flow RLS verification remains unavailable under `ENV-003`.
- Sentry issue and event reads remain unavailable under `ENV-004`.
