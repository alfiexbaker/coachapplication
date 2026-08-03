# Context dependency integrity verification

Date: 2026-08-02

Scope: booking discovery, bookings, children hub, club hub, match creation, and session-detail child projections.

## Defect

Seven hook dependency warnings exposed closures that read role, child, or user arrays indirectly through incomplete string signatures. The booking-discovery signature omitted child age even though age gates eligible sessions, so a profile update could retain an obsolete offering list. The match-context effect also called an interactive setter that closed over the previous selected squad.

## Fix

- Hooks that read the current child or user arrays now depend on those stable context values directly.
- Booking projections now depend on the current user object they inspect.
- Match-context hydration sets route-squad state directly and resets dependent error/count state without closing over the interactive setter.
- Source-boundary tests preserve those dependency and ownership decisions.

## Verification

- Focused cross-role and authority tests: 13/13 passed.
- Root TypeScript check: passed.
- Focused ESLint: passed with no errors; two pre-existing advisories in the touched legacy Club Hub were removed.
- Full React Doctor scan: 419 diagnostics across 187 files, comprising 13 classified errors and 406 warnings.
- `exhaustive-deps`: 0 findings, down from 7.
- Formatting and diff checks: passed.

The full React Doctor score remains 49 because broad performance and maintainability leads remain. No production or staging request, database row, Sentry event, permission rule, navigation target, or product copy changed.
