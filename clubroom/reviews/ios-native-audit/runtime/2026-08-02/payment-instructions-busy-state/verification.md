# Payment-instructions busy-state verification

Date: 2026-08-02 BST
Scope: coach earnings and invoice payment-instructions card

## Defects

- Load and save busy flags were cleared only after awaited service calls, so an unexpected rejection could leave the UI permanently loading or saving.
- The load effect could apply an obsolete coach result after its dependency changed.

## Fix

- A module-level busy-state helper guarantees cleanup without introducing React Compiler’s in-component `finally` limitation.
- Both load and save paths use that helper.
- The load effect now ignores state and toast updates after cleanup, so an older coach request cannot overwrite the current card.
- Existing backend authority, copy, validation, sharing, clipboard, and modal behavior are unchanged.

## Verification

- Root TypeScript typecheck passed.
- API-mode payment-instructions authority test passed: 1/1. It proved GET/PATCH use `/v1/coaches/me/payment-instructions` and local storage is not touched.
- React Doctor 0.9.3 analyzed the component and returned zero diagnostics for the changed slice.
- Focused ESLint passed with zero errors and zero warnings.
- Focused Prettier and `git diff --check` passed.

No production or staging request, bank detail, clipboard write, share action, or database mutation was used.
