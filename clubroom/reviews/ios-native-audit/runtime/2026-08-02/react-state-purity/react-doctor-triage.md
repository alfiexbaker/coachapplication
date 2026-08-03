# React state-purity triage

Date: 2026-08-02 BST
Scope: full React Doctor inventory followed by a six-file state-updater slice
Environment: local source and isolated compiled tests; no production or staging mutation

## Baseline

- React Doctor 0.9.3 full scan: 49/100.
- Diagnostics: 461 across 204 files; 31 errors and 430 warnings.
- No repository false-positive file exists.

## Fixed in this slice

- Progress-loop coach selection now clears selected athletes outside the selection-mode updater.
- Block-date and time-off start-date handlers update the paired end date outside the start-date updater.
- Coach feedback expansion writes its per-feedback ref before the state update instead of inside it.
- Consent dashboard stat filters update the selected type and filter state as independent event writes.
- Development-session position changes compute the next position set before pruning related ratings and selections.
- The rating-pruning membership checks use a `Set`, avoiding three new nested-array scan warnings.

## Filtered or deferred from the error inventory

- `artifact-env-leak`: two findings are inside `apps/api/dist/**/*.js.map`, which is server build output rather than a browser artifact. No value or credential was printed or mutated.
- `react-hooks-js/todo`: ten findings are explicit React Compiler implementation limitations. They remain recorded and are not presented as product bugs.
- `effect-needs-cleanup`: the video countdown timer is created only by a later recording action and is already cleared by the component unmount effect; the canonical rule prompt identifies this nested-handler shape as suppressible.
- Remaining confirmed error rules are still active under QA-025 and will be handled in later atomic slices.

## Verification

- Root typecheck: passed after the updater changes and after the `Set` cleanup.
- React Doctor changed scope: zero errors; one pre-existing `prefer-useReducer` warning in `BlockDateModal`.
- Consent dashboard authority boundary: passed.
- Development-session API authority boundary: passed.
- Progress-loop helper tests: 4/4 passed.
- The first isolated helper invocation failed before test execution because `/tmp` could not resolve the repository React package. Supplying the repository `NODE_PATH` resolved the harness issue and the test passed.

No native control geometry or product copy changed in this slice. Semantic native traversal remains subject to ENV-006.
