# QA-079 — child health no stale actions

## Scope

- Routes: `/child/:id/medical` and `/child/:id/emergency`
- Roles: linked parent and athlete in native iOS; verified and unverified coach plus non-guardian backend fixture
- Runtime: iPhone 16 Pro Max, local development mock audit; isolated Fastify seed fixture
- Safety: no staging or production request or mutation; no medical, emergency, or consent value was changed.

## Defect and correction

The dedicated hooks correctly denied unauthorised child-health reads and writes, but switching from a parent emergency route to an athlete denial could retain a stale `Add emergency contact` header action. The error screen blocked the form, yet an unavailable action was still visible.

The header action now renders only when the current route is ready. The parent keeps its contact controls. An athlete gets the existing terminal unavailable state with no data, retry, or mutation control.

## Native evidence

| State | Result | Screenshot |
| --- | --- | --- |
| Parent medical | Guardian view renders existing medical data and safety notice. | `parent-medical-ready.png` |
| Parent emergency | Guardian view retains contacts and Add Contact action. | `parent-emergency-ready.png` |
| Athlete medical | Terminal unavailable state with no protected detail or retry. | `athlete-medical-denied.png` |
| Athlete emergency before | A stale Add Contact control remained in the denied header after a role switch. | `athlete-emergency-before-stale-action.png` |
| Athlete emergency after | Terminal unavailable state contains no stale contact action or retry. | `athlete-emergency-denied.png` |

## Verification

- Test TypeScript compilation passed.
- Focused `child-health-authority-boundary` passed (3 tests).
- Focused ESLint and `git diff --check` passed.
- Native iOS validates parent reads and athlete denials for both routes; no form action was pressed.
- Fastify `family-athlete` seed fixture passed: unverified coach medical read 403; verified assigned coach read 200; verified coach consent write 403; non-guardian medical patch 403; success and denial audit/security events asserted. Fixture data resets on process exit.
- React Doctor changed-file scan is recorded with this slice; the remaining compiler diagnostic is the unrelated protected `hooks/use-group-session.ts` finding.

## External-system coverage

- The changed UI was exercised only in local mock mode.
- Supabase MCP is unavailable in this task (`ENV-003`); the read-only staging RLS posture remains recorded in `ENV-005`.
- Sentry issue read access remains blocked by token scope (`ENV-004`); no synthetic event was sent.
