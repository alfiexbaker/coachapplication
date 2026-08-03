# Lazy state initializer verification

Date: 2026-08-02

Scope: the family calendar's initial month and the coach scheduling modal's default cancellation tiers.

## Defect

Both initial values were constructed eagerly inside `useState`. React ignored those newly constructed values after the first render, so every subsequent render still repeated the date copy or cancellation-policy lookup.

## Fix

- `FamilyCalendar` now lazily copies `selectedDate` once when the component mounts.
- `SchedulingRulesModal` now lazily reads the default cancellation tiers once when the component mounts.
- A compiled source-boundary test prevents either initializer from becoming eager again.

## Verification

- Focused component and domain regression tests: 53/53 passed.
- Root TypeScript check: passed.
- Focused ESLint: passed.
- React Doctor diff scan: zero diagnostics.
- Formatting and diff checks: passed.

No product copy, navigation, permission rule, API request, database row, Sentry event, production service, or staging service changed.
