# Session invite inbox cache boundary

Date: 2026-08-03

## Finding

The session invite inbox retained a module-level list snapshot keyed only by `sent` or `received`. A second signed-in account could therefore be shown the previous account's list while its own request was pending or had failed. The received-invite quick decline action also showed a success toast without checking the service `Result`.

## Fix

- Removed the global warm snapshot.
- Scoped `useScreen` data to `session-invites:<user id>:<mode>` and use `cold-first` loading so a changed identity never reuses another account's frame.
- Made decline success conditional on a successful API result; denials now surface their returned error and do not refresh as if a change occurred.

## Verification

- `npm run typecheck` passed.
- `npm run test:compile` passed.
- `node --require ./scripts/test-register.js --test .tmp-tests/__tests__/hooks/session-invite-list-cache-boundary.test.js` passed.
- `npx eslint app/session-invites/index.tsx __tests__/hooks/session-invite-list-cache-boundary.test.ts` passed.
- `npm run typecheck` passed in `apps/api`.
- Seed-backed Fastify route tests passed for recipient and sender listing detail access direct invite writes authorization conflicts and invite response authorization. The test asserted `invite.create` deny and success audit events.
- React Doctor reported only the pre-existing user worktree diagnostic in `hooks/use-group-session.ts:140`; none in this slice.

## Limits

The actual native iOS semantic tree and VoiceOver flow remain blocked by ENV-009. Supabase MCP/RLS reconciliation and Sentry API access remain unavailable under ENV-003 and ENV-004. No production or staging mutation was made.
