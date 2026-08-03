# Group-session roster authority verification

Date: 2026-08-03

## Scope

- Route: `app/group-sessions/[id]/roster.tsx`
- Data: roster identities; RSVP status; attendance; injury reports; skill ratings
- Actors: assigned coach; privileged admin; parent; athlete; club member; unverified coach

## Finding and fix

`useGroupRoster` cached the roster only by session ID. Switching accounts on the same route could display the prior actor's warmed roster while the new request was resolving. The route also supplied attendance; cancellation; quick-rate; and injury controls to every roster reader even though the Fastify boundary grants different capabilities.

The cache key and refetch dependencies now include the authenticated actor. Attendance and roll call are limited to the assigned coach or privileged admin. Private rating is limited to a verified assigned coach (or mock mode). Injury reporting is limited to a verified assigned coach or privileged admin. A parent or athlete can only receive the cancellation control for their own registration. Guardian labels are omitted when the API deliberately withholds them. Icon-only controls and selection state now have labels.

## Verification

- `npm run typecheck` — passed.
- `npm run test:compile` — passed.
- Focused ESLint over the six changed production/test files — passed.
- `node --require ./scripts/test-register.js --test .tmp-tests/__tests__/hooks/group-roster-authority-boundary.test.js` — passed 3/3. Proves actor-scoped cache identity; action gating; accessible and truthful UI source contracts.
- `NODE_ENV=test API_DATA_BACKEND=seed ./node_modules/.bin/tsx --test --test-name-pattern='registers an athlete, returns coach roster, and marks attendance through one authority path' src/modules/booking/routes.test.ts` — passed. It proves the coach roster; parent identity projection; attendance success; and denied actor cases against the Fastify seed authority.
- `NODE_ENV=test API_DATA_BACKEND=seed ./node_modules/.bin/tsx --test --test-name-pattern='group roster injury logging requires verified assigned coach' src/modules/family-athlete/routes.test.ts` — passed. It proves unverified and unassigned coach denials (403) and verified assigned coach success (201).
- `npx react-doctor@latest --verbose --scope changed` — the only diagnostic is the pre-existing user-worktree change in `hooks/use-group-session.ts:140`; no changed roster file was reported.

## Limits

- Native iOS interaction-tree and VoiceOver verification remain blocked by ENV-009 (simulator/dev-client environment).
- Direct Supabase RLS verification remains unavailable (ENV-003). These tests use only an in-process seed backend.
- Sentry issue read is unavailable (ENV-004). No synthetic event was sent.
- No production or staging mutation was performed.
