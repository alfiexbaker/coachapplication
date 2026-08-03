# ROUTE-036 — multi-week booking authority

## Finding fixed

The multi-week screen reduced all coach availability to the first slot in each
calendar week, but the booking-series API accepts one start time and one
location for all occurrences. That meant the review could show a mixed set of
slots and the create request would silently use the first row's time and
location. The route could also replace the recurring offering the parent chose
with an unrelated coach availability pattern.

## Fix

- The rows now resolve from the selected recurring offering's day and time.
- The selected offering's venue is retained for every occurrence and the
  request; it is not overwritten by another availability row.
- Rows remain one coherent recurring slot, including explicit unavailable
  weeks, so a parent cannot select a different time in the middle of a series.
- A refresh only removes selections that are no longer open; it no longer
  reselects weeks the parent intentionally removed.
- The back control and week controls now have useful accessibility labels, the
  empty state contains only an available action, and fractional session prices
  retain pence throughout selection and confirmation.

## Verification

- Root `npm run typecheck` and `npm run test:compile` passed.
- Focused client authority and selection tests passed: 13/13. They prove the
  selected offering wins over unrelated availability, unavailable recurrence
  rows are not mixed with another slot, and `£40.50` does not become `£41`.
- Focused ESLint passed with no warnings.
- Seeded Fastify booking-series lifecycle test passed. It created the series
  through `POST /v1/booking-series`, then exercised the authoritative future
  occurrence lifecycle and audit-backed reassignment path.
- React Doctor's new array lookup finding was fixed. Its remaining compiler
  error is unrelated user worktree code at `hooks/use-group-session.ts:140`.
  Its `useCallback` warning for this route is intentionally retained: `useScreen`
  uses the stable loader identity as its refetch dependency, so removing it
  would cause loader churn rather than a safe simplification.

## Limits

The actual iOS semantic tree, touch flow, and VoiceOver retest remain blocked
by ENV-009. This slice used only `NODE_ENV=test API_DATA_BACKEND=seed`; it did
not mutate production or staging booking, audit, database, Supabase, or Sentry
state. Direct Supabase RLS and Sentry issue reads remain unavailable under
ENV-003 and ENV-004.
