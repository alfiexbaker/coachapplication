# Raise concern access state — 2026-08-03

Scope: `ROUTE-112` (`/roster/[athleteId]/raise-concern`).

Finding: a roster API access denial was caught and relabelled `UNKNOWN`, so an ineligible coach could receive a retryable generic failure instead of the terminal unavailable state.

Fix: preserve the typed service error before it reaches `useScreen`. `UNAUTHORIZED` and `NOT_FOUND` now render the existing terminal concern-access state with no retry control.

Verification, local and non-destructive:

- Root typecheck and compiled `raise-concern-access-boundary.test.ts` — passed.
- `NODE_ENV=test API_DATA_BACKEND=seed ./node_modules/.bin/tsx --test --test-name-pattern='one-to-one raise concern path enforces coach assignment and verification' src/modules/trust-ops/routes.test.ts` — passed: unverified and unassigned coaches receive 403; an assigned verified coach receives 201; audit outcomes are asserted.

Native iOS semantic retest remains blocked by `ENV-009`; no production, staging, Supabase, or Sentry state changed.
