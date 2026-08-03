# Club detail authority verification

## Scope

`ROUTE-049` covers `app/club/[id].tsx`, `hooks/use-club-detail.ts`, and the shared member-list controls. This was a local source and isolated-seed-Fastify audit. No staging or production request or mutation was made.

## Findings fixed

- API-mode club detail compared a returned canonical membership identity with the app-local user identity. `listClubs()` already returns only the signed-in viewer's memberships, so the comparison was both redundant and capable of hiding valid authority. The selected club's returned viewer membership is now used directly.
- The member list advertised long-press removal for every non-owner, including peers and higher-ranked staff whom Fastify correctly rejects. It now offers removal only where the current role outranks the target. The handler repeats that check before opening a destructive confirmation.
- `Create Event` was nested under post permission. An active event staff member without a club-post grant can now see the actual event action, while `New Post` remains independently permission-gated.
- A missing display name blocked a backend-authorised removal. The API derives the actor from bearer auth, so the UI no longer imposes that false prerequisite; `Club manager` is only legacy mock history metadata.

## Authority trace

```text
Club detail -> useClubDetail -> clubAuthorityService.listClubs -> GET /v1/clubs
  -> returned viewerMembership -> post/event/member control visibility

Role / remove / ban -> clubService -> Fastify coach-club routes
  -> assertCanManageTargetRole -> ClubMembership / AuditEvent

Squad mutation -> clubService -> Fastify squad-member route
  -> assignment context -> ClubMembership / Athlete / SquadMembership / AuditEvent
```

The client only decides whether to render an actionable control. Fastify remains the source of truth and records success and denial audit events.

## Validation

```text
npm run test:compile
# pass

node --require ./scripts/test-register.js --test \
  .tmp-tests/__tests__/hooks/club-detail-member-authority-boundary.test.js \
  .tmp-tests/__tests__/hooks/club-hub-api-boundary.test.js
# 4 pass; 0 fail

npm run typecheck
# pass

npx eslint hooks/use-club-detail.ts app/club/[id].tsx \
  components/club/MembersPanel.tsx components/club/club-feed-list-header.tsx \
  __tests__/hooks/club-detail-member-authority-boundary.test.ts
# pass; 0 warnings; 0 errors

cd apps/api
NODE_ENV=test API_DATA_BACKEND=seed ./node_modules/.bin/tsx --test \
  --test-name-pattern='lists and mutates club members through governed v1 authority|assigns and removes club members from squads through governed v1 authority' \
  src/modules/coach-club/routes.test.ts
# 2 pass; 40 skipped; 0 fail
```

`club-detail-api-boundary.test.ts` was also run. Two of its three checks passed; the remaining assertion expects the exact pre-existing `services/social-feed-service.ts` mock-loader source. That file is user-owned active work in this checkout and was not changed to force a green result.

## Explicit limits

- Native iOS interaction, semantic traversal, Dynamic Type, and VoiceOver remain blocked by `ENV-009` CoreSimulator XPC installation failure.
- Direct Supabase per-flow RLS verification remains unavailable under `ENV-003`.
- Sentry issue and event reads remain unavailable under `ENV-004`.
