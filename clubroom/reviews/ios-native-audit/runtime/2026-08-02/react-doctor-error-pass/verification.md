# React Doctor error-pass verification

Date: 2026-08-02 BST
Scope: full repository React and React Native source
Tool: React Doctor 0.9.3 with canonical per-rule validation prompts

## Outcome

| Metric | Initial full scan | Post-fix full scan |
|---|---:|---:|
| Raw score | 49/100 | 49/100 |
| Diagnostics | 461 | 442 |
| Errors | 31 | 13 |
| Warnings | 430 | 429 |
| Affected files | 204 | 200 |

The raw score does not apply the local validation decisions below. It still counts the three remaining error rule keys even though no confirmed fix-now occurrence remains.

## Fixed product errors

- Six impure state-updater diagnostics across progress; availability; feedback; consent; and development handlers.
- Six overlapping render-ref diagnostics in Quick Rate (`refs` and `no-ref-current-in-render`).
- Four hook-reference diagnostics caused by the immutable `api.useMock` property name.
- Two manual-memoization dependency diagnostics in Club Hub and session detail.

Total fixed error diagnostics: 18.

## Validation-suppressed errors

- `artifact-env-leak` — 2. Both findings are untracked TypeScript source maps under `apps/api/dist`; the API package starts `dist/server.js` with Node. These are server build outputs rather than browser artifacts. No source-map content or environment value was printed.
- `effect-needs-cleanup` — 1. The countdown interval is created only by the later record-video event. The component unmount effect calls `clearCountdownTimer`, and close/stop paths clear the same ref. The canonical prompt explicitly identifies event-owned nested timers with existing teardown as suppressible.

Validation-suppressed count: 3. Static suppression count: 0 because no `.react-doctor/false-positives.md` exists.

## Deferred compiler limitations

Ten `react-hooks-js/todo` diagnostics remain. Their canonical rule prompt defines them as unimplemented React Compiler features rather than code mistakes. Refactoring working async flows merely to satisfy a compiler limitation would add risk without product value, so these instances are deferred and remain visible in QA-025.

## Validation record

- Root typecheck passed after every atomic error fix.
- React Doctor slice scans cleared each confirmed error class before commit.
- Focused lint checks had zero errors; existing warnings were retained for the warning pass.
- Focused authority/helper tests are recorded in QA-027 through QA-030.
- Final full scan contains only the 13 classified errors above.

No production or staging mutation was run. The 429-warning pass remains open.
