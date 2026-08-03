# ROUTE-105 — fixture list capability boundary

## Scope

`app/matches/index.tsx` uses `hooks/use-matches-screen.ts`; fixture cards use
`components/match/match-card.tsx`. The screen resolves club context through
`services/club-authority-service.ts` and reads fixtures through the Fastify
match-list route.

## Findings fixed

1. The screen treated the broad app account label `COACH` or `ADMIN` as club
   authority. That could show fixture-management controls and staff availability
   summaries for an actor without staff authority in the visible club.
2. Fastify now derives and returns `canManageMatches` on visible-club list and
   detail projections. It is true for an active club staff role or privileged
   admin only. The client fails closed when that capability is absent.
3. Fixture cards derive their staff availability view from each match's existing
   backend `canManageMatch` capability rather than from the account role.

## Verification

- `npm run typecheck` — passed.
- `apps/api: npm run typecheck` — passed.
- `npm run test:compile` plus list/detail static authority contracts — passed: 2/2.
- `NODE_ENV=test API_DATA_BACKEND=seed ... club-match-capability.test.ts match-detail-boundary.test.ts` — passed: 2/2. Staff capability was true; ordinary member capability false; privileged-admin capability true; fixture visibility projection remained correct.
- Targeted ESLint — no errors; six pre-existing array-style warnings.

## Limits

This ran only with `NODE_ENV=test API_DATA_BACKEND=seed`; no production or
staging state changed. Native iOS retest remains blocked by `ENV-009`; Sentry
issue read remains unavailable as `ENV-004`; Supabase MCP remains unavailable
as `ENV-003`.
