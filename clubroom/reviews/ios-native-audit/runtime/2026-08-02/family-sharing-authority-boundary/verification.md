# QA-074 — family sharing authority boundary

## Scope

- Route: `/family/sharing`
- Roles: parent administrator, athlete with no family account, coach with no family account
- Runtime: iPhone 16 Pro Max, local development mock mode, native Expo Go
- Safety: seeded local fixtures and in-process Fastify fixtures only. No staging or production mutation.

## Defect and correction

`getFamilyAccount` creates a mock family account when none exists. The sharing screen used it for every signed-in role, so an athlete or coach could create an unrelated account simply by reading this route. The screen also rendered invitation, cancellation and removal controls for any guardian even though the API rejects those mutations for non-administrators.

The screen now uses a non-creating lookup for users without children, keeps the required legacy mock bootstrap only for a parent who owns children, derives management authority from that guardian's `ADMIN` permission, hides unavailable controls, and rechecks authority before each mutation. API-mode lookup remains backend-authoritative and read-only.

## Native evidence

| Role | Result | Screenshot |
| --- | --- | --- |
| Parent administrator | Existing family account loads with the single `Invite guardian` action. | `parent-admin-account.png` |
| Athlete | Terminal `Family account unavailable` state; no retry or management action. | `athlete-no-family-account.png` |
| Coach | Terminal `Family account unavailable` state; no retry or management action. | `coach-no-family-account.png` |

Role entry uses the local audit deep link. The route was reopened after the role handoff settled, so the captured target route reflects the final actor.

## Verification

- Root `npm run typecheck` passed.
- Focused service and authority-boundary tests passed (10 tests).
- Focused ESLint passed.
- Seeded Fastify fixture test selected two family-authority cases: administrator invite returned `201`; non-admin invite returned `403`; success and denial audit assertions passed.
- `git diff --check` passed.

## External-system coverage

- The changed native route was run in local mock mode; it made no network request.
- Fastify was exercised through its seed fixture only; its store is discarded on process exit.
- The broader staging database/RLS posture remains recorded in `ENV-005` (read-only catalog preflight). Supabase MCP remains unavailable (`ENV-003`).
- Sentry read access remains blocked by token scope (`ENV-004`); no synthetic event was sent.
