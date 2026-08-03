# ROUTE-086 — family sharing read-only boundary

## Finding fixed

In mock mode, opening Family Sharing used `getFamilyAccount` whenever the
profile reported children. That method creates a family account if none exists,
so a settings read could silently change family ownership and persisted mock
state. The route's empty state already says a linked family is required; the
implementation contradicted it.

## Fix

- Family Sharing now always calls `findFamilyAccount` when loading.
- No linked family produces the existing terminal unavailable state; it does
  not create an account or surface management controls.
- The authority regression now explicitly forbids `getFamilyAccount` in this
  route. Existing admin-only controls, direct action labels, and API authority
  remain unchanged.

## Verification

- Root `npm run typecheck` and `npm run test:compile` passed.
- Family read-only hook and service tests passed: 10/10. The service proves a
  non-family read returns no account without creating one.
- Focused ESLint passed with no warnings.
- Seed Fastify guardian lifecycle tests passed: family-admin invite and
  cancellation; removal of a non-primary guardian; primary removal conflict;
  invite list and acceptance only by the invited user; outsider acceptance
  denial. The relevant success and deny audit events were asserted.
- React Doctor found no issue in this slice. Its only remaining error is the
  unrelated user worktree file `hooks/use-group-session.ts:140`.

## Limits

The test used only isolated `NODE_ENV=test API_DATA_BACKEND=seed` state. It
did not read or mutate production or staging records. Native iOS interaction
and VoiceOver remain blocked by ENV-009; direct Supabase RLS and Sentry issue
access remain unavailable under ENV-003 and ENV-004.
