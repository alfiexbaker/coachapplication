# QA-080 — roster emergency simplification

## Scope

- Route: `/roster/:athleteId/emergency`
- Roles: assigned coach and athlete in native iOS; verified and unverified coach plus non-guardian API fixture
- Runtime: iPhone 16 Pro Max, local development mock audit; isolated Fastify seed fixture
- Safety: no staging or production request or mutation; no call action was invoked.

## Defect and correction

The authorised coach route showed the same medical-alert values twice: a truncated strip in the emergency hero and a complete list immediately below. In a safety screen that duplication adds noise and hides the end of a medication name.

The hero now contains only the athlete, alert level, primary contact, and its one call action. The full untruncated alert list remains in the dedicated Medical Alerts section. The contact separator is a neutral dot rather than an awkward dash sequence.

## Native evidence

| State | Result | Screenshot |
| --- | --- | --- |
| Coach before | Alert pills were duplicated and the medication label was truncated in the hero. | `coach-before-duplicate-alerts.png` |
| Coach after | One alert summary and one complete readable detail list; primary call control remains. | `coach-simplified.png` |
| Athlete | Terminal unavailable state with no emergency data or retry. | `athlete-denied.png` |

## Verification

- Test TypeScript compilation passed.
- Focused `emergency-access-authority-boundary` passed (3 tests).
- Root `npm run typecheck`, focused ESLint, and `git diff --check` passed.
- Native iOS retest passed for the assigned coach and athlete denial state.
- The isolated Fastify family-athlete fixture used for QA-079 also passed current coach/non-guardian medical and consent authority: unverified coach medical read 403; verified assigned coach read 200; verified coach consent write 403; non-guardian medical patch 403; auditable success and denial outcomes asserted. Fixture data resets on process exit.
- React Doctor changed-file scan is recorded with this slice; the remaining compiler diagnostic is the unrelated protected `hooks/use-group-session.ts` finding.

## External-system coverage

- The changed UI was exercised only in local mock mode.
- Supabase MCP is unavailable in this task (`ENV-003`); the read-only staging RLS posture remains recorded in `ENV-005`.
- Sentry issue read access remains blocked by token scope (`ENV-004`); no synthetic event was sent.
