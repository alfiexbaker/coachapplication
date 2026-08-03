# QA-076 — family recurring-plan access boundary

## Scope

- Route: `/family/recurring`
- Roles: linked parent, athlete, coach
- Runtime: iPhone 16 Pro Max, local development mock audit
- Safety: no staging or production request or mutation. All Fastify tests use disposable seed fixtures.

## Defect and correction

The family recurring-plan route loaded for every signed-in actor and showed `Start Recurring Plan` to a coach. The action targets a parent booking flow, so it was a dead and misleading control. Its hook also used an unstable function in `useScreen` dependencies, causing unnecessary dependency refetches.

The route now uses the canonical linked-family capability before loading plans, rendering plan controls, navigating to subscription, or calling pause/resume/cancel/skip handlers. Ineligible actors receive a terminal unavailable state. The hook now depends on stable user/capability values instead of its recreated loader function. A linked parent keeps the existing empty-plan CTA.

## Native evidence

| Role | Result | Screenshot |
| --- | --- | --- |
| Parent | Existing `No recurring plans yet` state and `Start Recurring Plan` action remain available. | `parent-empty-plans.png` |
| Athlete | Terminal unavailable state; no plan, retry, or subscription CTA. | `athlete-denied.png` |
| Coach | Terminal unavailable state; no plan, retry, or subscription CTA. | `coach-denied.png` |

Each target route was reopened after the local audit role handoff settled.

## Verification

- Root `npm run typecheck` passed.
- Canonical family-child capability tests plus focused recurring plan tests passed (8 recurring scenarios and 3 capability cases).
- Focused ESLint and `git diff --check` passed.
- Seeded Fastify booking-series fixtures passed: blocked relationship creates return `409` with a `booking_series.create` denial audit and no persisted series; an allowed series exercised create, reassign, pause and resume with invoice and status-event assertions.
- React Doctor's changed-file scan remains limited by the existing protected user-owned `hooks/use-group-session.ts` compiler diagnostic; it did not identify the recurring files.

## External-system coverage

- This UI proof ran in local mock mode. Denied roles return before the recurring service or mutation handler.
- API-mode recurring plans map to backend booking-series authority; frontend mutation handlers do not replace that API boundary.
- Staging RLS posture is recorded in `ENV-005`; Supabase MCP is unavailable in this task (`ENV-003`).
- Sentry issue read access remains blocked by token scope (`ENV-004`); no synthetic event was sent.
