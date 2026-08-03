# Quick Rate saving-lifecycle verification

Date: 2026-08-02 BST
Scope: group-roster Quick Rate save action

## Defect

Saving-state cleanup was duplicated across service-error branches and then performed once after the `try`/`catch`. The pattern was fragile: a new return or thrown error could leave the modal permanently busy.

## Fix

A small module-level lifecycle helper now owns `setSaving(true)` and guarantees `setSaving(false)` with `finally`. The component’s save work retains the same skill-update, feedback-save, toast, callback, keyboard, and close order.

The first direct `finally` implementation was rejected because React Compiler reports in-component try-finalizers as an unsupported construct. Keeping the guard outside the component preserves the correctness guarantee without introducing a compiler error.

## Verification

- Root TypeScript typecheck passed after capturing the narrowed position before the async closure.
- Progress feedback and skills happy/error suites passed: 15/15 tests.
- Final React Doctor 0.9.3 slice scan returned zero diagnostics; the loading warning and compiler limitation are both absent.
- Focused ESLint passed with zero errors and zero warnings.
- Focused Prettier and `git diff --check` passed.

No production or staging request, database mutation, or live coach rating was used.
