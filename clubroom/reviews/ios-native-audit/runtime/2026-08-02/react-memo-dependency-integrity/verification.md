# Current-user memo dependency verification

Date: 2026-08-02 BST
Scope: Club Hub and session-detail modal hooks

## Finding

Two `useMemo` callbacks capture the `currentUser` object but declared only `currentUser?.id` in their dependency arrays. React Compiler could not prove that the hand-written memoization preserved the callback semantics.

## Change

- Club Hub club lookup now depends on `currentUser`.
- Session-detail actor identity derivation now depends on `currentUser`.

The derived values and permission logic are unchanged. The memos may now recompute when the authenticated user object is replaced even if its ID is unchanged, which matches the captured dependency.

## Verification

- Root typecheck passed after each file edit.
- React Doctor changed scope: zero errors. Ten existing `react-compiler-no-manual-memoization` warnings remain for the warning pass.
- Focused ESLint: zero errors and four existing warnings.
- Session-detail API boundary tests: 3/3 passed.
- Club Hub boundary tests: 2/3 passed.
- Isolated test compile: passed.
- `git diff --check`: passed.

## Newly exposed baseline drift

The failing Club Hub assertion does not exercise either memo. It compares `navigation/tab-access-policy.ts` with an older regex that expects the admin restricted list to contain only `schedule`, `athletes`, and `children`; the executable policy also contains `coach-profile`. Both files are clean relative to `HEAD`, so this is recorded as QA-031 for permission-aware review rather than changed inside this slice.

No API contract or database state changed. No production or staging mutation was run.
