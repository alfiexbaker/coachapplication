# Injury-detail contract simplification

Date: 2026-08-03

## Finding

The injury detail UI rendered a recovery timeline, notes composer, progress slider, and percentage even though the Fastify injury contract has no recovery-note collection or persisted percentage. In API mode every returned injury had an empty timeline and a derived 0/60/100 value. Saving a note appended text to the injury description and the slider value disappeared after a reload. That was a fabricated product flow.

## Fix

- Removed the unsupported recovery timeline, note composer, progress slider, and their now-unreachable components.
- Kept actual injury facts: status, injury date, expected recovery date, sharing state, and the API-backed healed transition.
- Added a visible error when the healed transition is denied or fails instead of logging it silently.

## Verification

- `npm run typecheck` passed.
- `npm run test:compile` passed.
- Focused injury-detail contract test passed.
- Focused ESLint passed with no errors or warnings in changed code and test files.
- Seed Fastify injury-authority tests passed: 2/2 projection and private-write denials; the injury lifecycle test passed create list detail update validation and audited outcomes.
- React Doctor found no functional issue in this slice. Its two warnings identify deliberate stable callbacks required by `useFocusEffect`; its only compiler error remains the unrelated user worktree file `hooks/use-group-session.ts:140`.

## Limits

Native iOS semantics and VoiceOver remain blocked by ENV-009. Direct Supabase RLS and Sentry issue access remain unavailable under ENV-003 and ENV-004. No production or staging injury record was read or mutated. A real recovery journal needs a separate backend model and authority contract before it can return to the product.
