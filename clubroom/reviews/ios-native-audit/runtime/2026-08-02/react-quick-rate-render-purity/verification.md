# Quick Rate render-purity verification

Date: 2026-08-02 BST
Role: coach
Surfaces: session completion and Quick Rate modal

## Defect

`useQuickRate` compared and updated two refs during render to retain the previous athlete array when its content key had not changed. Render work can be replayed or discarded, so those writes were unsafe and caused six overlapping React Doctor and React Compiler error diagnostics.

## Change

- Athlete content still uses the same `athleteId:athleteName` key.
- A small synchronization effect updates the athlete ref after commit.
- The synchronization effect is declared before the prefill effect, so a changed key is available before prefill runs.
- The prefill effect now reads the ref inside the effect and depends on the athlete content key rather than the parent array identity.

This preserves the intended behavior: recreating an equivalent athlete array does not restart API-backed prefill; changing roster content does.

## Verification

- Root typecheck: passed.
- React Doctor changed scope: zero errors.
- Focused ESLint: zero errors.
- Focused Prettier check: passed.
- `git diff --check`: passed.

The existing `no-set-state-after-await-in-effect` warning remains visible for the warning pass. The effect already owns an `AbortController` and checks it before final writes; no claim is made that this separate warning is resolved here.

No API contract or database state changed. No production or staging mutation was run.
