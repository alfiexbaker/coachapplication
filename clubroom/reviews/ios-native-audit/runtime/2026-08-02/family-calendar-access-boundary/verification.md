# QA-075 — family calendar access boundary

## Scope

- Route: `/family/calendar`
- Roles: linked parent, athlete, coach
- Runtime: iPhone 16 Pro Max, local development mock audit
- Safety: no staging or production request or mutation. Fastify validation uses its disposable seed fixture.

## Defect and correction

The Family Calendar hook called family-member and club-event services for every signed-in actor. The current fixtures were empty for an athlete, but that was accidental data timing rather than an access decision; a direct route could still load family data when fixtures changed. It also showed a generic `Find Coaches` CTA instead of explaining that the view is family-owned.

The hook now uses the existing canonical `shouldLoadFamilyChildren` capability before loading data. Coach, admin and ordinary athlete actors do not make those requests. The screen now presents a terminal `Family calendar unavailable` state with no retry or booking control. A linked parent keeps the existing calendar and empty state.

## Native evidence

| Role | Result | Screenshot |
| --- | --- | --- |
| Parent | Existing empty calendar state and `Find Coaches` next step remain available. | `parent-empty-calendar.png` |
| Athlete | Terminal unavailable state; no family data, retry or CTA. | `athlete-denied.png` |
| Coach | Terminal unavailable state; no family data, retry or CTA. | `coach-denied.png` |

Each target route was reopened after the local audit role handoff settled.

## Verification

- Root `npm run typecheck` passed.
- The canonical family-child capability unit tests passed (3 tests): coach/admin denied; ordinary user denied; parent-like actor allowed.
- Focused ESLint and `git diff --check` passed.
- React Doctor's changed-file scan reports one pre-existing compiler-optimization limitation in the protected user-owned `hooks/use-group-session.ts`; it did not flag either changed calendar file.
- Seeded Fastify family-read fixture passed: an assigned non-owner can read only the explicitly assigned athlete; unassigned athlete reads return `403`; forbidden update/delete paths are asserted. Fixture data is discarded on process exit.

## External-system coverage

- This UI proof ran in local mock mode and made no network request for denied roles.
- Eligible API-mode reads remain backend-authoritative through the family and booking services.
- Staging RLS posture is recorded separately in `ENV-005`; Supabase MCP is unavailable in this task (`ENV-003`).
- Sentry issue read access remains blocked by token scope (`ENV-004`); no synthetic event was sent.
