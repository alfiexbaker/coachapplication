# Owner dashboard authority verification

## Scope

`ROUTE-047` covers `app/club/[clubId]/dashboard.tsx`, `hooks/use-club-dashboard.ts`, `services/org-owner-dashboard-service.ts`, and the Fastify owner-dashboard route. This was a local source and isolated-seed-Fastify audit. No staging or production request or mutation was made.

## Findings fixed

- The client dashboard frame had no actor identity, so a later account could retain the former account's finance, staffing, completion, or family-support summary while its own request resolved. The screen key and dependencies now include the actor and validated club route.
- A malformed dynamic route produced a generic required-ID failure. It now reports an invalid dashboard link explicitly.
- Fastify built staffing, head-coach oversight, and finance data before checking that the requester was an owner or admin. It now performs a minimal owner/admin membership lookup first, checks active/non-deleted status and normalized role, and only then projects sensitive operational data. Privileged-admin access remains explicit.

## Authority trace

```text
Owner dashboard -> getDashboardData -> GET /v1/clubs/:clubId/owner-dashboard
  -> minimal Club + ClubMembership owner/admin access check
  -> staffing console + head-coach oversight + finance + support projections
  -> club_owner_dashboard.read sensitive-read audit event
```

The route now defaults to deny before booking, invoice, coach-health, or family-support projections are assembled.

## Validation

```text
npm run test:compile
# pass

node --require ./scripts/test-register.js --test \
  .tmp-tests/__tests__/hooks/club-dashboard-authority-boundary.test.js \
  .tmp-tests/__tests__/services/org-owner-dashboard-service.test.js
# 2 pass; 0 fail

npm run typecheck
# pass

npx eslint hooks/use-club-dashboard.ts \
  apps/api/src/modules/coach-club/owner-dashboard.ts \
  __tests__/hooks/club-dashboard-authority-boundary.test.ts
# pass; 0 warnings; 0 errors

cd apps/api
NODE_ENV=test API_DATA_BACKEND=seed ./node_modules/.bin/tsx --test \
  --test-name-pattern='returns owner dashboard projection from governed backend sources' \
  src/modules/coach-club/routes.test.ts
# 1 pass; 41 skipped; 0 fail
```

The Fastify case exercised a member denial, owner/admin success, privileged-admin success, support and finance projections, and `club_owner_dashboard.read` success and denial audit assertions.

## Explicit limits

- Native iOS interaction, semantic traversal, Dynamic Type, and VoiceOver remain blocked by `ENV-009` CoreSimulator XPC installation failure.
- Direct Supabase per-flow RLS verification remains unavailable under `ENV-003`.
- Sentry issue and event reads remain unavailable under `ENV-004`.
