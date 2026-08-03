# QA-077 — family overview access boundary

## Scope

- Route: `/family`
- Roles: linked parent and athlete; coach capability proof through the shared unit test
- Runtime: iPhone 16 Pro Max, local development mock audit
- Safety: no staging or production request or mutation.

## Defect and correction

An athlete could deep-link into the Family overview and receive Calendar, Recurring bookings, Children, Guardian access, privacy guidance, and a booking CTA. Most of those actions route directly to family-owned screens and were either impossible or inappropriate for the actor. This was a hub full of dead controls, not a useful athlete surface.

The overview now applies the same canonical linked-family capability at the entry point. Ineligible actors receive one terminal `Family unavailable` state with no actions. A linked parent retains the existing menu and booking action.

## Native evidence

| State | Result | Screenshot |
| --- | --- | --- |
| Athlete before | Four family controls and a booking CTA were shown even though the child, calendar, recurring and guardian routes are family-owned. | `athlete-before-dead-controls.png` |
| Athlete after | Terminal unavailable state; no family data, retry, route control, or CTA. | `athlete-denied.png` |
| Parent after | Existing family menu and booking CTA remain available. | `parent-actions-available.png` |

The native audit role handoff became sticky on the preceding parent identity when attempting this exact coach route, so no coach screenshot is claimed. The shared capability test covers coach denial, and QA-075/QA-076 have separate native coach denials using the same rule.

## Verification

- Root `npm run typecheck` passed.
- Canonical family-child capability unit tests passed (3 tests): coach/admin denied; ordinary user denied; parent-like actor allowed.
- Focused ESLint and `git diff --check` passed.
- No API call belongs to this route once it is denied. The API-backed calendar and recurring child routes remain separately validated in QA-075 and QA-076.
- React Doctor's changed-file scan remains limited by the existing protected user-owned `hooks/use-group-session.ts` compiler diagnostic; it did not identify this family-index file.

## External-system coverage

- The changed UI was exercised only in local mock mode.
- Supabase MCP is unavailable in this task (`ENV-003`); the read-only staging RLS posture remains recorded in `ENV-005`.
- Sentry issue read access remains blocked by token scope (`ENV-004`); no synthetic event was sent.
