# ROUTE-107 — booking review authority

## Scope

`app/review/[bookingId].tsx` uses the current booking plus
`GET /v1/bookings/:bookingId/reviews/me` and
`POST /v1/bookings/:bookingId/reviews` through
`services/review-sync-service.ts`.

## Finding fixed

The screen used the broad client `COACH` role as an eligibility decision, while
an authoritative rejected review-status response was merely logged. A denied
actor could therefore reach a form that would fail on submission. The screen
now derives `reviewAccess` from the review-status authority, hides the form on
an explicit denial, guards direct submission, and treats unexpected status
failures as load errors rather than permission success.

## Verification

- Root `npm run typecheck`, `npm run test:compile`, and screen authority contract — passed.
- API `npm run typecheck` — passed.
- Seeded booking lifecycle test — passed: completed-only review; coach and
  unrelated guardian denial; review-status denial; allowed guardian creation;
  status read; idempotent replay; one persisted feedback row; audit proof.
- Targeted ESLint — passed with no warnings.

## Limits

The test used only `NODE_ENV=test API_DATA_BACKEND=seed`; it created no
production or staging review, booking, notification, audit, Sentry, database,
or external-service state. Native iOS retest remains blocked by `ENV-009`;
Sentry issue read by `ENV-004`; Supabase MCP by `ENV-003`.
