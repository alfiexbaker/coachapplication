# QA-087 — Native audit role handoff

Date: 2026-08-03
Environment: local development mock native-audit mode only
Device: iPhone 16 Pro Max simulator `902FA3F5-08F8-417B-B60E-9245A9B86EC6`

## Finding

An external `clubroom://revyl-auth` link could be intercepted by Expo Router's route and immediately redirected to the root route. That made a requested audit role look active when the prior local demo account could remain active. It was an audit-harness defect, not a product authentication path.

## Fix

`app/revyl-auth.tsx` now performs the same strict, test-only evaluation as the root URL listener. It accepts only the existing development, mock, native-audit configuration; exact token; allowlisted role; and allowlisted redirect. It signs into the resolved demo account before replacing the approved route. A rejected request shows one terminal state and makes no login attempt.

## On-device proof

- Valid parent link → Family: `parent.png`
- Valid athlete link → My Progress: `athlete.png`
- Valid coach link → Sessions: `coach.png`
- Valid admin link → Users: `admin.png`
- Invalid token → visible terminal rejection: `invalid-token-denied.png`

## Verification

- `npm run typecheck` passed.
- `npm run test:compile` and the focused backstop test passed.
- `npx eslint app/revyl-auth.tsx __tests__/utils/revyl-auth-backstop.test.ts` passed.
- React Doctor reported no finding in this slice; its only remaining finding is the protected user work in `hooks/use-group-session.ts:140`.
- Native screenshots were captured after each settled handoff.

No Fastify, Supabase, staging, or production write occurred. Sentry remains read-only blocked by ENV-004 token scope.
