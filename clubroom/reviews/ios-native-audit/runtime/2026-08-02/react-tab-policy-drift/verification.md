# Admin coach-profile tab-policy verification

Date: 2026-08-02 BST
Role: club admin
Surface: tab access and legacy coach-profile compatibility route

## Finding

The executable `constants/route-access.ts` policy restricts `coach-profile` for `ADMIN`, and the dedicated coach-profile boundary test explicitly requires that behavior. The Club Hub API-boundary test still matched an older three-item admin restriction list, causing a focused regression failure.

## Change

Only the stale assertion changed. It now expects `coach-profile` in the admin restricted-route list and names the actual permission requirement: club admins remain outside the coach self-profile tab.

No runtime policy or route changed. This does not widen or narrow access.

## Verification

- Isolated test compile: passed.
- Club Hub API boundary: 3/3 passed.
- Coach-profile route boundary: 5/5 passed.
- Focused ESLint: passed.
- Focused Prettier: passed.
- `git diff --check`: passed.

No API or database state changed. No production or staging mutation was run.
