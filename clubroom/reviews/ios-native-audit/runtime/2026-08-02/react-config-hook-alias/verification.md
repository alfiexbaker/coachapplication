# Compiler-safe runtime config verification

Date: 2026-08-02 BST
Scope: Offline Banner; create-match hook; member-management hook

## Finding

The immutable runtime flag is named `api.useMock`. React Compiler interpreted the hook-shaped property name as a hook referenced as a normal value when it appeared inside render and hook bodies. This produced four `react-hooks-js/hooks` errors even though the value is plain configuration.

## Change

Each affected module now reads the flag once as `USE_MOCK` at module initialization and uses that boolean for the existing branches. No mock/API condition changed.

## Verification

- Root typecheck passed after each of the three file edits.
- React Doctor changed scope no longer reports any `react-hooks-js/hooks` error.
- Focused ESLint: zero errors. The existing create-match exhaustive-deps warning remains.
- Focused formatting: Offline Banner and create-match pass; member management retains existing whole-file formatting drift.
- `git diff --check`: passed.

The remaining create-match `react-hooks-js/todo` finding is an explicit React Compiler implementation limitation and remains in QA-025. No API contract or database state changed; no production or staging mutation was run.
