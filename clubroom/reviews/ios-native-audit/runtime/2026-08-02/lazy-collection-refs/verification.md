# Lazy collection ref verification

Date: 2026-08-02

Scope: feed deduplication, chat read tracking, group roll call, booking invite submission, progress mutation queues, screen snapshots, and session-payment submission locks.

## Defect

Ten `useRef(new Set())` or `useRef(new Map())` calls reconstructed a collection on every render even though React retained only the first instance. The discarded collections added work to frequently rendered screens and hooks.

## Fix

- Added one `useLazyRef` boundary backed by a lazy state initializer, yielding one stable mutable `.current` cell without writing a ref during render.
- Replaced all ten eager collection refs while preserving the same mutable `.current` contract.
- Effects that consume the custom ref explicitly depend on its stable returned object.
- A source-boundary test proves the shared initializer and all ten migrations.

## Verification

- The first null-guarded `useRef` helper passed the diff scan but the repository-wide scan classified its render-time assignment as an error. It was replaced before handoff with the lazy state-backed cell described above.
- Focused screen, service, authority, messaging, payment, progress, and feed-helper tests: 27/27 passed.
- Final lazy-cell boundary retest: 1/1 passed.
- Focused strict TypeScript project: passed.
- Root TypeScript check: passed.
- Focused ESLint error check and formatting: passed.
- React Doctor diff scan: zero diagnostics; `rerender-lazy-ref-init` and `no-ref-current-in-render` are zero in the changed scope.
- Diff check: passed.

Two unrelated feed authority assertions were excluded because concurrent changes to `services/social-feed-service.ts` made those source assertions fail independently of this slice. No production or staging request, database row, Sentry event, permission rule, navigation target, product copy, or visible UI changed.
