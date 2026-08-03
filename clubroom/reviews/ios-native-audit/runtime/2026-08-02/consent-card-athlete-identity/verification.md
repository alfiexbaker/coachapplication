# Consent-card athlete-identity verification

Date: 2026-08-02 BST
Scope: consent roster card resolved athlete name

## Defect

The card stored only a resolved name string. When the `athleteConsent` prop changed, the previous athlete’s name remained renderable until the new lookup finished, even though late responses were already ignored. That could pair one child’s name with another child’s consent status.

## Fix

- Resolved names are stored with the athlete ID they belong to.
- The card uses a resolved name only when that ID matches the current consent record; otherwise it immediately falls back to the current athlete label.
- The lookup captures the athlete ID and uses an `AbortController` signal check before updating state.
- The promise-callback shape preserves the guard while avoiding React Doctor 0.9.3’s false positive on the guarded async-IIFE form.
- A boundary test locks the ID binding, captured lookup, abort guard, and cleanup.

## Verification

- Root TypeScript typecheck passed on the final implementation.
- Full consent, consent-card logic, and identity boundary run passed: 62/62 tests.
- The final identity boundary was recompiled and rerun after the promise-shape adjustment: 1/1 passed.
- Final React Doctor 0.9.3 slice scan returned zero diagnostics.
- Focused ESLint, Prettier, and `git diff --check` passed.

No production or staging athlete, guardian, consent, safeguarding, or database data was read or changed.
