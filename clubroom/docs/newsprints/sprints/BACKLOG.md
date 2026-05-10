# Sprint Backlog

Updated: 2026-05-10
Rule: active work only. Completed sprint rows are intentionally removed.

## Open Queue

| ID             | Exactly what it does                                                                                                                                                                                                                                                     | Spine(s)                                                     | Status |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ | ------ |
| UX-QA-01       | Build the repeatable micro-interaction defect pipeline: static audits, UI-flow capture/review, hot-path issue inventory, and first burn-down slice for dead controls, native popups, spinner-only actions, missing accessibility labels, and broken transition feedback. | Trust/Safety/Ops + Booking/Revenue + Development + Community | OPEN   |
| PROD-VERIFY-01 | Rehearse the production db-backed runtime end to end: release preflight, web export, UI flows, and the remaining non-mock critical journeys; fix code-path drift and leave only real env/provisioning blockers.                                                          | Trust/Safety/Ops + Booking/Revenue + Development             | READY  |

## Execution Order

1. `UX-QA-01`
2. `PROD-VERIFY-01`

## Active Pruning Plan

Source:

- `docs/product-reality/FEATURE_TRIAGE_BOARD_2026-05-06.md`
- `docs/newsprints/sprints/FEATURE_PRUNE_SPRINTS_2026-05-06.md`

Decision:

- Product pruning and `UI-LOAD-08` route closure are complete for the launch route tree.
- Do not spend QA effort on routes classified as `DELETE`.
- `discover/map.tsx` is protected and should be hardened as a central launch discovery path.

## Sprint Intent

- Turn micro-interaction cleanup into a repeatable gate rather than a one-off taste pass.
- Keep the next production rehearsal honest by finding dead controls, broken feedback, awkward transitions, missing accessibility labels, and stale visual seams before deploy.

## Premium Bar

- If a surface has loaded once, dropping the whole screen back to a blank skeleton is a failure.
- If a placeholder does not match the loaded layout family, it is a failure.
- If a tab switch causes a visible white flash, empty pane, or full reset, it is a failure.
- If a click path goes `click -> blank/flicker -> load -> show`, it is a failure.
- If a long list stutters because the loading treatment is too heavy, it is a failure.
- If a feed-style surface still relies on a generic `ScrollView` without a strong reason, it is a failure.
- If loading looks decorative instead of truthful, it is a failure.

## Elite Plan Rules

- The plan is not elite if it only names screens; it must define interaction choreography.
- The plan is not elite if it lacks closure; every async route must belong to a named sprint or a documented exception.
- The plan is not elite if it lacks measurement; hot paths need explicit review conditions, not taste-based approval.
- The plan is not elite if it lets implementation hide behind “polish later”.
- The plan is not elite if it optimizes shimmer aesthetics before stability, retention, and truthful hierarchy.
- The plan is not elite unless it makes the cheap path harder than the correct path.

## Recursive Coverage Gate

- Current route inventory:
  - `154` route files under `app/`
  - `154` routes now covered by `navigation/loading-route-manifest.js`
  - `0` routes rely on the static fallback rule
  - `96` routes that use `ScrollView` without list virtualization at the route file level
  - `16` tabbed or segmented routes
  - `41` app/component files using `ActivityIndicator`
- Closure rule:
  - every route must be explicitly classified as one of:
    - `warm-first`: existing data stays visible while refresh happens
    - `section-skeleton`: only the unresolved section uses a truthful placeholder
    - `submit-only`: no entry skeleton; only action-progress/loading affordance is needed
    - `static`: no async loading contract required
  - no async route is allowed to remain “implicitly handled”
  - every interactive async path must declare the visible transition sequence from click until resolved content is shown
  - every hot path must also declare:
    - whether prior data is retained
    - what shell remains stable
    - what exact section may skeletonize
    - what would count as a ship-blocking flicker
- Reality check:
  - the loading foundation now exists in shared code plus `navigation/loading-route-manifest.js`
  - latest loading coverage audit: `submit-only=5`, `section-skeleton=105`, `static=20`, `warm-first=24`
  - `scripts/loading-route-coverage-audit.js` is the route-closure gate that later slices inherit
  - `UI-LOAD-08` route closure is done; `UX-QA-01` inherits the manifest and focuses on interaction defects outside loading classification

## Sprint Notes

### `UX-QA-01`

- Need:
  - One repeatable audit/capture/review loop for micro-interaction defects.
  - A first issue inventory with severity and owner surface, not vague polish notes.
  - A first burn-down slice that removes the highest-risk interaction defects before deployment.
  - Pipeline entrypoint: `node ./scripts/ui-quality-pipeline.js` for local static gates plus optional browser flows when Expo web is running.
  - Release pipeline entrypoint: `node ./scripts/ui-quality-pipeline.js --require-flows` so browser-flow coverage cannot be silently skipped.
- Touch first:
  - `scripts/audit-ui.js`
  - `scripts/lint-ui-actions.js`
  - `scripts/ui-quality-pipeline.js`
  - `scripts/ui-flow-checks-50.mjs`
  - `scripts/ui-story-capture*.mjs`
  - `app/(tabs)/*`
  - `app/book-coach.tsx`
  - `app/discover/map.tsx`
  - booking, invoice, settings, club, and trust action surfaces
  - `docs/ui/loading-error-empty-state-matrix.md`
- Acceptance:
  - Static audits flag raw native popups, dead actions, icon-only actions without labels, and spinner-only action feedback.
  - UI-flow runs produce a reviewable report for hot paths and classify micro defects as blocker, high, medium, or defer.
  - First burn-down commit fixes the blocker/high issues discovered by the new pipeline.
- Hard fail if:
  - A visible action cannot complete, route, or explain why it is disabled.
  - An action has no immediate feedback while work is pending.
  - Icon-only controls ship without an accessibility label.
  - Native/browser popups replace app-native confirmation, toast, banner, action sheet, or inline feedback in normal product flows.
- Verify:
  - `node ./scripts/ui-quality-pipeline.js`
  - `node ./scripts/audit-ui.js`
  - `node ./scripts/lint-ui-actions.js`
  - `node ./scripts/loading-route-coverage-audit.js`
  - `npm run typecheck` when `npm` is available
  - `npm run test:compile` when `npm` is available
  - `npm run ui:flows:run` when `npm` is available
  - `git diff --check`
