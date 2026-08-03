# Event list authority verification

## Scope

`ROUTE-081` covers the Club Events list, its creation entry point, draft filtering, and its in-memory screen identity. It is a source and compiled-contract audit only. No production or staging request or mutation was made.

## Findings fixed

- `currentUser.role` was used as a proxy for authority. A coach account with a normal club membership could see a dead Create action, while a valid club staff member with a different account role could not.
- The first readable club was always selected, so a staff member could land in a member-only club and lose the valid creation path.
- The list cache had no actor identity. A warm staff frame could therefore survive an account change.
- Draft hiding depended on the same generic account role. It now fails closed for a non-staff actor even if stale data reaches the component.

The list now derives its staff flag from an active membership and the canonical `isClubStaffRole` policy. It picks a managed club first, otherwise the first accessible club. Create controls and draft visibility share that flag, and the cache key is `events-list:<actor>`.

## Validation

```text
npm run typecheck
# pass

npm run test:compile
# pass

node --require ./scripts/test-register.js --test \
  .tmp-tests/__tests__/hooks/events-list-authority-boundary.test.js \
  .tmp-tests/__tests__/hooks/event-create-publish-authority-boundary.test.js \
  .tmp-tests/__tests__/hooks/create-event-club-context.test.js
# 3 pass; 0 fail

npx eslint app/events/index.tsx \
  components/event/events-list-sections.tsx \
  __tests__/hooks/events-list-authority-boundary.test.ts
# pass; 0 warnings; 0 errors
```

React Doctor reports no list-authority error. Its remaining error is the user-owned `hooks/use-group-session.ts:140`. The two Fast Refresh warnings in `components/event/events-list-sections.tsx` predate this change because it exports section helpers from a component file; that cleanup is intentionally outside this authority slice.

## Explicit limits

- Native iOS interaction, semantic traversal, and VoiceOver remain blocked by `ENV-009` CoreSimulator XPC installation failure.
- Direct Supabase RLS verification remains unavailable under `ENV-003`.
- Sentry issue/event reads remain unavailable under `ENV-004`.
