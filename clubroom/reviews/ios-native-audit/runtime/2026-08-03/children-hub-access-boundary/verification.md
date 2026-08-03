# QA-078 — children hub access boundary

## Scope

- Routes: `/children` and `/add-child`
- Roles: linked parent and athlete in native iOS; coach/admin denial in the shared capability test
- Runtime: iPhone 16 Pro Max, local development mock audit
- Safety: no staging or production request or mutation; no child was created.

## Defect and correction

An athlete could open the child-management hub and see zero-value guardian statistics, a plus control, and an `Add Child` CTA. The mock create capability returned `true` for every signed-in account, so the direct Add Child route also had no role-aware decision before it began checking access.

The hub and create capability now share the canonical linked-family rule. Ineligible actors see one terminal unavailable state; direct Add Child requests redirect to the actor's own progress route. Linked parents retain the hub, add control, and three-step player form. An initial implementation left an ineligible direct request indefinitely checking; native iOS exposed the blank route, and the completed fix stores a resolved deny decision before redirecting.

## Native evidence

| State | Result | Screenshot |
| --- | --- | --- |
| Athlete hub before | Plus control and `Add Child` CTA were visible. | `athlete-before-dead-controls.png` |
| Athlete hub after | Quiet unavailable state; no child statistic, action, retry, or CTA. | `athlete-hub-denied.png` |
| Parent hub after | Linked parent sees two child cards and the Add Child control. | `parent-hub-ready.png` |
| Athlete direct Add Child | Redirects to My Progress instead of rendering the form or a blank checker. | `athlete-add-child-redirected.png` |
| Parent direct Add Child | Player details step renders with the expected 1/3 progress state. | `parent-add-child-ready.png` |

The iOS role handoff returned the coach to its default development route instead of the nested Children tab, so no coach screenshot is claimed. The shared capability test proves coach/admin denial and the athlete native route proves the ineligible UI result.

## Verification

- Test TypeScript compilation passed.
- `family-child-context-user` and `add-child-authority-boundary` passed: 4 tests total.
- Focused ESLint and `git diff --check` passed.
- Native iOS evidence covers both hub and direct route allow/deny outcomes.
- No API call is made by the denied hub or eligibility check in local mock mode; Add Child form creation was not submitted.
- React Doctor changed-file scan is recorded with this slice; its remaining compiler diagnostic is the unrelated protected `hooks/use-group-session.ts` finding.

## External-system coverage

- The changed routes were exercised only in local mock mode.
- Supabase MCP is unavailable in this task (`ENV-003`); the read-only staging RLS posture remains recorded in `ENV-005`.
- Sentry issue read access remains blocked by token scope (`ENV-004`); no synthetic event was sent.
