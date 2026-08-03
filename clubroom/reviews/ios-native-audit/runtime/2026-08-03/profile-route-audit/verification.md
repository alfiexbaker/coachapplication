# ROUTE-106 — privacy-filtered user profile

## Scope

`app/profile/[userId].tsx` loads `services/user-service.ts#getUserById`, renders
only the backend user-directory projection, and coordinates follow-request and
post reactions through their own authorities.

## Findings fixed

The identity routes accepted shared-contract Zod validation errors but the global
Fastify handler could not recognise that separate Zod instance. Invalid user
search queries and invalid profile paths consequently escaped as raw `500`s.
`apps/api/src/modules/identity/routes.ts` now detects structural Zod validation
errors, records `DENY` with `VALIDATION_FAILED`, preserves a 400 audit status,
and returns safe `400` problem responses.

## Verification

- `apps/api: npm run typecheck` — passed.
- Seeded identity boundary test — passed: visible related minor profile allowed;
  unrelated minor and private adult hidden; blocks hide profiles; date of birth
  absent; bad query variants and blank profile path return `400`; unauthenticated
  reads return `403`; success and denial audits recorded.
- Seeded follow-request lifecycle — passed: requester/target states, private
  inbox isolation, target-only acceptance, mutual follow creation, block denial,
  and audit events.
- Root app `npm run typecheck` and `npm run test:compile` — passed before the
  API-only correction. Targeted ESLint passed with no route errors.

## Limits

Only `NODE_ENV=test API_DATA_BACKEND=seed` data was changed by tests. No
production or staging identity, relationship, post, audit, Sentry, database, or
external-service state changed. Native iOS retest remains blocked by `ENV-009`;
Sentry issue read by `ENV-004`; Supabase MCP by `ENV-003`.
