# Cancellation-policy save-lifecycle verification

Date: 2026-08-02 BST
Scope: coach cancellation-policy settings hook and screen state

## Defects

- The `saving` flag was reset only after an awaited policy write, so an unexpected rejection could leave every template disabled.
- A normal failed service result was silently ignored, giving the coach no reason why the policy did not change.

## Fix

- A module-level saving-state helper guarantees cleanup without using React Compiler’s unsupported in-hook try-finalizer shape.
- Failed service results and unexpected exceptions now populate the hook’s existing error surface.
- A successful policy reload clears old save errors.
- Templates, tiers, refund calculations, and backend authority are unchanged.

## Verification

- Root TypeScript typecheck passed.
- Scheduling rules, policy, refund, validation, and API-authority suites passed: 39/39 tests.
- API-mode coverage includes self-write enforcement, non-self denial, authority failure, and no raw rule payload logging.
- React Doctor 0.9.3 analyzed the hook and returned zero diagnostics for the changed slice.
- Focused ESLint passed with zero errors and zero warnings.
- Focused Prettier and `git diff --check` passed.

No production or staging policy, booking, refund, or database row was changed.
