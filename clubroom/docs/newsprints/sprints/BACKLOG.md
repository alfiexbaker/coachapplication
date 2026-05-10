# Sprint Backlog

Updated: 2026-05-10
Rule: active work only. Completed sprint rows are intentionally removed.

## Open Queue

| ID       | Exactly what it does                                                                                                                                                                                                                                                     | Spine(s)                                                     | Status |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ | ------ |
| UX-QA-01 | Build the repeatable micro-interaction defect pipeline: static audits, UI-flow capture/review, hot-path issue inventory, and first burn-down slice for dead controls, native popups, spinner-only actions, missing accessibility labels, and broken transition feedback. | Trust/Safety/Ops + Booking/Revenue + Development + Community | OPEN   |
| PDOS-01  | Give every launch route and major component a persona, paid-development job, source-of-truth service, primary CTA, loading/action contract, and keep/demote/delete verdict.                                                                                              | Trust/Safety/Ops + Booking/Revenue + Development + Community | READY  |
| PDOS-02  | Cut social and results drift: remove/demote matches, recent-results modules, personal feed/follow/profile posting, generic community mechanics, likes/share, and any route not tied to paid delivery or operational communication.                                       | Community + Trust/Ops + Development                          | READY  |
| PDOS-03  | Harden Discover Map, public coach profiles, saved coaches, trust proof, verified reviews, paid offers, price/from-price, next-slot, and bookability state into a truthful storefront-to-booking path.                                                                    | Booking/Revenue + Trust + Development                        | READY  |
| PDOS-04  | Unify one-to-one sessions, small groups, camps, clinics, club training, and programmes into one paid session product family with shared price, capacity, eligibility, schedule, roster, attendance, payment, and proof language.                                         | Booking/Revenue + Development + Club Ops                     | READY  |
| PDOS-05  | Make school owner/admin/head-coach staff authority real: capability-backed create/assign/reassign flows, assistant limits, coach queues, sensitive visibility rules, and audited assignment events.                                                                      | Club Ops + Trust/Safety/Ops + Booking/Revenue                | READY  |
| PDOS-06  | Move booking/registration final success and minor readiness to backend truth: review-step submission, idempotency, child readiness summaries, coach eligibility, inline blockers, and receipt-only confirmation screens.                                                 | Booking/Revenue + Trust/Safety/Ops                           | READY  |
| PDOS-07  | Build the coach delivery console around assigned work, roster context, safety essentials, attendance register, completion, feedback, proof, next work, and concern escalation.                                                                                           | Development + Trust/Safety/Ops + Club Ops                    | READY  |
| PDOS-08  | Connect attendance/completion to session-linked development proof: notes, feedback, video, reviews, saved coach, rebook, recurring/continue-plan, and child/parent outcome cards.                                                                                        | Development + Booking/Revenue + Trust                        | READY  |
| PDOS-09  | Make money a single operating layer across bookings, group registrations, camps, and programmes: invoice lines, hosted/manual payment state, reminders, reconciler entries, earnings, payer views, and owner exports.                                                    | Booking/Revenue + Trust/Safety/Ops                           | READY  |
| PDOS-10  | Reframe club operations into paid activity coordination and compliance evidence: squads, staff, schedules, capacity, waitlists, family communication, safeguarding, finance, attendance registers, and redacted exports.                                                 | Club Ops + Booking/Revenue + Trust/Safety/Ops                | READY  |
| PDOS-11  | Rehearse the db-backed production runtime end to end across discovery, booking, group registration, delivery, payment, proof, owner ops, assignment, and compliance exports; burn down code drift and leave only real env/provider blockers.                             | Trust/Safety/Ops + Booking/Revenue + Development + Club Ops  | READY  |

## Execution Order

1. `UX-QA-01`
2. `PDOS-01`
3. `PDOS-02`
4. `PDOS-03`
5. `PDOS-04`
6. `PDOS-05`
7. `PDOS-06`
8. `PDOS-07`
9. `PDOS-08`
10. `PDOS-09`
11. `PDOS-10`
12. `PDOS-11`

## Active Pruning Plan

Source:

- `docs/product-reality/FEATURE_TRIAGE_BOARD_2026-05-06.md`
- `docs/newsprints/sprints/FEATURE_PRUNE_SPRINTS_2026-05-06.md`
- `docs/newsprints/sprints/PAID_DEVELOPMENT_OS_SPRINTS_2026-05-10.md`

Decision:

- Product pruning and `UI-LOAD-08` route closure are complete for the launch route tree.
- Do not spend QA effort on routes classified as `DELETE`.
- `discover/map.tsx` is protected and should be hardened as a central launch discovery path.
- Clubroom should feel like the operating system for paid football development, not a generic football social platform.
- Single sessions and group sessions are both core, but they should share one paid session product spine instead of feeling like separate products.
- School owner/admin, coach, parent, child, and compliance value must be explicit before a feature is kept.
- Production rehearsal starts only after booking/registration, child readiness, attendance, proof, money, and compliance evidence have backend-authoritative launch paths.

## Sprint Intent

- Turn micro-interaction cleanup into a repeatable gate rather than a one-off taste pass.
- Keep the next production rehearsal honest by finding dead controls, broken feedback, awkward transitions, missing accessibility labels, and stale visual seams before deploy.
- Drive the product through the hard paid-development loop: discover -> offer -> readiness -> booking/registration -> payment -> delivery -> attendance -> proof -> rebook -> compliance evidence.

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
