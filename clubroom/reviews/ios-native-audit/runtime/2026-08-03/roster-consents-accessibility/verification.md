# QA-081 — roster consent signal and accessibility

## Scope

- Route: `/roster/consents`
- Roles: coach and athlete in native iOS; coach and non-coach in the isolated Fastify fixture
- Runtime: iPhone 16 Pro Max in local development mock audit; isolated API seed and DB-fixture tests
- Safety: no staging or production request or mutation; no consent state was changed.

## Defect and correction

The coach dashboard coloured every non-zero consent percentage green. A 20% or 40% permission rate is not a success signal when a coach is deciding whether material can be published. The back and filter controls were also icon-only without accessible names.

The dashboard now uses green only for fully granted consent, amber for partial consent, and red for no consent. Its stat filters, back control, and filter control expose clear accessible labels and states. No new UI was added.

## Native evidence

| State | Result | Screenshot |
| --- | --- | --- |
| Coach before | Partial consent was incorrectly green. | `coach-before-misleading-green.png` |
| Coach after | Partial consent is amber; absent consent remains red; information hierarchy is unchanged. | `coach-final-semantic-states.png` |
| Athlete | Direct route is terminal with no consent rows and no retry. | `athlete-denied.png` |

## Verification

- Test TypeScript compilation passed.
- Focused roster-consent authority and fail-closed dashboard tests passed (2 tests).
- The isolated Fastify roster-consents fixture passed both seed and DB-fixture projections (2 tests): authorised coach returns roster rows; outsider receives 403; two success and one denial audit event are asserted.
- Focused ESLint passed.
- Native iOS retest passed for the coach and athlete direct route.
- Root `npm run typecheck` and `git diff --check` passed. React Doctor's changed-file scan reports only the unrelated protected `hooks/use-group-session.ts:140` compiler limitation; this slice introduces no React Doctor finding.

## External-system coverage

- The changed UI was exercised only in local mock mode.
- Native semantic traversal remains unavailable because local DevTools security blocks XCUITest (`ENV-006`); source-level accessibility assertions and the real rendered controls provide the available evidence.
- Supabase MCP remains unavailable (`ENV-003`) and the recorded staging RLS posture remains read-only (`ENV-005`).
- Sentry issue access remains blocked by token scope (`ENV-004`); no synthetic event was sent.
