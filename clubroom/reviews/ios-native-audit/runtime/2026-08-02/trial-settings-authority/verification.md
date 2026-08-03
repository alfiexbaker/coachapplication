# Trial settings authority verification

Date: 2026-08-02

Scope: coach trial-session pricing and availability editor.

## Defect

The editor treated a failed authoritative load as if defaults were safe. It then exposed editable default prices, so a coach could overwrite an existing paid configuration without seeing it. The asynchronous load also lacked an active-context guard, allowing an obsolete coach response to populate a later coach context. A successful empty response did not reset values left by a previous coach.

## Fix

- Every load is scoped to the current coach and retry version.
- Obsolete and unmounted loads cannot update the form or loading state.
- A successful `null` response resets every field to explicit defaults.
- A failed load renders the existing inline error/retry surface and does not render the editor or save action.
- Retry starts a fresh authoritative load.

## Verification

- Trial editor boundary and trial-service API/mock tests: 8/8 passed.
- Final editor boundary retest: 3/3 passed.
- Focused strict TypeScript project: passed.
- Root TypeScript check: passed.
- Focused ESLint error check, formatting, and diff check: passed.
- React Doctor changed-file scan: no errors; two reviewed advisories remain (`prefer-useReducer` for the six controlled form fields and `set-state-in-effect` for the intentional loading transition before the external request).

No production or staging request, database row, Sentry event, role permission, navigation target, or native alert changed.
