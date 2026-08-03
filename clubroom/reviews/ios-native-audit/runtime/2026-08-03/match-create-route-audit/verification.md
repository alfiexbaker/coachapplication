# ROUTE-104 — match creation authority and validation

## Scope

`app/matches/create.tsx` calls `hooks/use-create-match.ts`, then
`services/match-service.ts`, then `POST /v1/clubs/:clubId/matches`.

## Findings fixed

1. A contract-validation error produced by the shared-contract package could be a
   different Zod instance from Fastify's local Zod package. The create route now
   recognises the structural Zod error, records `club_match.create` with
   `DENY` / `VALIDATION_FAILED`, and returns the safe `400` problem response
   `Request payload did not match contract` rather than leaking through as `500`.
2. The client rejects a non-integer or out-of-range squad size before submitting;
   it no longer silently substitutes a default of 14.
3. The client surfaces the safe API validation message when one is present.

## Verification

- `NODE_ENV=test API_DATA_BACKEND=seed ./node_modules/.bin/tsx --test --test-name-pattern='persists club matches' src/modules/coach-club/routes.test.ts` — passed: one focused lifecycle test, 41 intentionally unmatched tests skipped. It proves member denial, invalid payload `400` responses, staff creation, result authority, schedule projection, and seeded audit lifecycle.
- `npm run typecheck` — passed.
- `apps/api: npm run typecheck` — passed.
- `npm run test:compile` plus create/match API boundary tests — passed: 6/6.

## Limits

All evidence used `NODE_ENV=test API_DATA_BACKEND=seed`; no production or staging
match, player, audit, database, Sentry, or external-service state was mutated.
Native iOS retest remains blocked by `ENV-009` (the local simulator installation
hangs in CoreSimulator XPC). Sentry issue read remains unavailable as `ENV-004`;
Supabase MCP remains unavailable as `ENV-003`.
