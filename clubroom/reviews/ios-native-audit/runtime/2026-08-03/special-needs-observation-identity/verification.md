# Needs and notes observation identity boundary

Date: 2026-08-03

## Finding

The coach-observation subtree carried its own local list and modal state without an account identity boundary. If one authorised coach was replaced with another on the same athlete route, the old coach's observation frame could remain visible until the next request settled. Privileged administrators could also be shown edit and remove controls for notes that the API correctly allows only the author to change. The composer exposed a privacy switch even though the product has no shared-observation behaviour behind it.

## Fix

- Keyed the observation subtree by the signed-in user so an account change tears down its list and open modal before the next actor loads.
- Passed the active user id into each observation card and render edit/remove only for the observation author.
- Removed the unsupported sharing/privacy control and create new coach observations as private.

## Verification

- `npm run typecheck` passed.
- `npm run test:compile` passed.
- Focused client authority suites passed: 6 assertions across the athlete-development and coach-observation boundaries.
- Focused ESLint passed with no errors or warnings in the changed files.
- Seed-backed Fastify test passed: an assigned coach can list create update and remove; a guardian read and foreign coach update are denied; audited create read update and removal outcomes are asserted.
- React Doctor found no issue in this slice. Its only reported diagnostic remains the pre-existing user worktree change at `hooks/use-group-session.ts:140`.

## Limits

Native iOS semantics and VoiceOver remain blocked by ENV-009. Direct Supabase RLS and Sentry issue access remain unavailable under ENV-003 and ENV-004. The legacy API `isPrivate` field remains for compatibility; UI no longer implies it provides a coach-sharing feature. No production or staging data was changed.
