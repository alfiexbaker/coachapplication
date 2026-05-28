# Sprint Backlog

Updated: 2026-05-12
Rule: active work only. Completed sprint rows are intentionally removed.

## Open Queue

| ID          | Exactly what it does                                                                                                                                                                                                                                                     | Spine(s)                                                     | Status |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ | ------ |
| OBS-RUNTIME-01 | Close the Sentry/runtime smoke loop: keep one app Sentry initializer, remove wizard/test noise, require API-mode startup to run with the Fastify API reachable, add API `SENTRY_DSN`, and use Sentry issue review as a release gate before staging rehearsal.             | Trust/Safety/Ops                                             | OPEN   |
| PROD-API-01 | Use the production readiness matrix to burn down API authority and UI linkup risk: trace untraced backend routes, keep API boundary audit clean, triage the 90 route decisions, and start booking authority hardening before broader feature work.                       | Trust/Safety/Ops + Booking/Revenue + Development + Club Ops  | OPEN   |
| UX-QA-01    | Build the repeatable micro-interaction defect pipeline: static audits, UI-flow capture/review, hot-path issue inventory, and first burn-down slice for dead controls, native popups, spinner-only actions, missing accessibility labels, and broken transition feedback. | Trust/Safety/Ops + Booking/Revenue + Development + Community | OPEN   |
| PDOS-01     | Give every launch route and major component a persona, paid-development job, source-of-truth service, primary CTA, loading/action contract, and keep/demote/delete verdict.                                                                                              | Trust/Safety/Ops + Booking/Revenue + Development + Community | READY  |
| PDOS-02     | Protect staff-led feed and coach homepage while cutting loose social/results drift: parent top-level posting, vanity following, likes/share, generic community mechanics, and matches outside selected squad/team schedule context.                                      | Community + Trust/Ops + Development                          | READY  |
| PDOS-03     | Harden Discover Map, coach homepages, followed coaches, trust proof, verified reviews, paid offers, price/from-price, next-slot, and bookability state into a truthful storefront-to-booking path.                                                                       | Booking/Revenue + Trust + Development                        | READY  |
| PDOS-04     | Unify `1-to-1`, `Group Session`, `Holiday Camp`, and paid blocks into one paid session product family with shared price, capacity, eligibility, schedule, roster, attendance, payment, and proof language.                                                               | Booking/Revenue + Development + Club Ops                     | READY  |
| PDOS-05     | Make school owner/admin/head-coach staff authority real: capability-backed create/assign/reassign flows, lead/support coach assignment, coach queues, sensitive visibility rules, refund hard walls, and audited assignment events.                                      | Club Ops + Trust/Safety/Ops + Booking/Revenue                | READY  |
| PDOS-06     | Move booking/registration final success and minor readiness to backend truth: review-step submission, idempotency, child readiness summaries, coach eligibility, inline blockers, and receipt-only confirmation screens.                                                 | Booking/Revenue + Trust/Safety/Ops                           | READY  |
| PDOS-07     | Build the coach delivery console around assigned work, roster context, safety essentials, attendance register, completion, feedback, proof, next work, and concern escalation.                                                                                           | Development + Trust/Safety/Ops + Club Ops                    | READY  |
| PDOS-08     | Connect attendance/completion to session-linked development proof: notes, feedback, video, reviews, saved coach, rebook, recurring/continue-plan, and child/parent outcome cards.                                                                                        | Development + Booking/Revenue + Trust                        | READY  |
| PDOS-09     | Make money a single operating layer across bookings, group registrations, holiday camps, and blocks: invoice lines, hosted/manual payment state, SMS/2FA refund hard wall, reminders, reconciler entries, earnings, payer views, and owner exports.                      | Booking/Revenue + Trust/Safety/Ops                           | READY  |
| PDOS-10     | Reframe club operations into paid activity coordination and compliance evidence: squads, staff, schedules, capacity, waitlists, family communication, safeguarding, finance, attendance registers, and redacted exports.                                                 | Club Ops + Booking/Revenue + Trust/Safety/Ops                | READY  |
| PDOS-11     | Rehearse the db-backed production runtime end to end across discovery, booking, group registration, delivery, payment, proof, owner ops, assignment, and compliance exports; burn down code drift and leave only real env/provider blockers.                             | Trust/Safety/Ops + Booking/Revenue + Development + Club Ops  | READY  |

## Execution Order

1. `OBS-RUNTIME-01`
2. `PROD-API-01`
3. `UX-QA-01`
4. `PDOS-01`
5. `PDOS-02`
6. `PDOS-03`
7. `PDOS-04`
8. `PDOS-05`
9. `PDOS-06`
10. `PDOS-07`
11. `PDOS-08`
12. `PDOS-09`
13. `PDOS-10`
14. `PDOS-11`

## Active Pruning Plan

Source:

- `docs/product-reality/FEATURE_TRIAGE_BOARD_2026-05-06.md`
- `docs/newsprints/sprints/FEATURE_PRUNE_SPRINTS_2026-05-06.md`
- `docs/newsprints/sprints/PAID_DEVELOPMENT_OS_SPRINTS_2026-05-10.md`
- `docs/newsprints/sprints/PRODUCTION_READINESS_MATRIX_2026-05-11.md`

Decision:

- Product pruning and `UI-LOAD-08` route closure are complete for the launch route tree.
- Do not spend QA effort on routes classified as `DELETE`.
- `discover/map.tsx` is protected and should be hardened as a central launch discovery path.
- Clubroom should feel like the operating system for paid football development, not a generic football social platform.
- Staff-led feed and coach homepage are protected centrepieces when they are operational communication surfaces.
- Launch product language is `1-to-1`, `Group Session`, and `Holiday Camp`; `Block` is packaging over repeated sessions, not a separate delivery world.
- School owner/admin, coach, parent, child, and compliance value must be explicit before a feature is kept.
- Production rehearsal starts only after booking/registration, child readiness, attendance, proof, money, and compliance evidence have backend-authoritative launch paths.

## Sprint Intent

- Turn micro-interaction cleanup into a repeatable gate rather than a one-off taste pass.
- Keep the next production rehearsal honest by finding dead controls, broken feedback, awkward transitions, missing accessibility labels, and stale visual seams before deploy.
- Drive the product through the hard paid-development loop: discover -> offer -> readiness -> booking/registration -> payment -> delivery -> attendance -> proof -> rebook -> compliance evidence.

## Agentic Environment Gates

- `npm run verify:slice` is the default no-human-review slice gate for static guardrails, agentic readiness, API boundary drift, native alert usage, dead UI actions, and `git diff --check`.
- `npm run verify:slice:app`, `npm run verify:slice:api`, `npm run verify:slice:ui`, and `npm run verify:slice:full` add the relevant app, API, UI, or combined verification gates.
- `docs/templates/AI_TASK_PACKET.md` is the standard planning packet for non-trivial AI implementation slices.
- `node ./scripts/agentic-readiness-pipeline.js` is the broad local runner for DB staging readiness, PDOS route authority, and static UI-quality checks.
- `node ./scripts/db-staging-preflight.js` checks whether a real staging DB/API/object-storage rehearsal can start without pretending missing env is product progress.
- `npm --prefix apps/api run dev:staging` or `npm run api:dev:staging` starts Fastify with `.env.staging.local`, including LAN-safe `API_HOST=0.0.0.0` when the app API URL is a LAN address. The canonical staging command is non-watch for stable smoke/rehearsal startup; use `npm --prefix apps/api run dev:staging:watch` only when active API editing needs reload behavior.
- `npm run smoke:api-mode` checks that API-mode Expo has a reachable Fastify `/v1/ready` endpoint before startup; use `npm run smoke:api-mode:strict` when the rehearsal must require full readiness, not just reachability.
- `node ./scripts/pdos-route-authority-audit.js` gives agents the current route-to-sprint/persona/verdict matrix plus route risks such as direct fetches, local storage authority, native alerts, money hard walls, and sensitive reads.
- Add `--write` to these commands when a review artifact is needed under `reviews/`; do not commit generated review output unless the sprint explicitly asks for a frozen snapshot.
- Add `--strict` only when the sprint is meant to fail on blockers, because `PDOS-01` intentionally starts with routes still needing product decisions.

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

### `OBS-RUNTIME-01`

- Need:
  - One app-side Sentry initialization path through `services/observability/sentry-service.ts`.
  - No hardcoded DSN or broad PII/session-replay wizard config in product code.
  - API-mode local startup instructions that run `apps/api` before Expo.
  - API Sentry project and `SENTRY_DSN` set so `/v1/ready` is not degraded only because observability is missing.
  - Sentry issue review before staging rehearsal, separating deliberate setup test issues from real runtime failures.
- Current Sentry findings from 2026-05-12:
  - `REACT-NATIVE-1` and `REACT-NATIVE-4` are deliberate setup test events and should be resolved in Sentry.
  - `REACT-NATIVE-2` is `TypeError: Network request failed` from the iOS simulator in `runtime_mode=api`.
  - `REACT-NATIVE-3` is the app logging failed API reads for `clubroom.clubs`, `clubroom.club_memberships`, and `clubroom.club_invite_codes`.
  - Root cause for `REACT-NATIVE-2/3`: Expo was started in API mode while port `4000` was not serving the Fastify API.
- Acceptance:
  - `npx expo install --check` stays clean.
  - `npm run typecheck` stays clean.
  - `curl http://127.0.0.1:4000/v1/ready` responds after starting `npm --prefix apps/api run dev:staging` without relying on file watch mode.
  - `npm run smoke:api-mode` passes before starting Expo in API mode.
  - `npm run smoke:api-mode:strict` passes before treating the staging runtime as release-ready.
  - API-mode Expo startup is tested with the API already running.
  - Unresolved Sentry issues contain no setup-test noise before production rehearsal.
- Verify:
  - `npm run smoke:api-mode`
  - `npm run smoke:api-mode:strict` for release-ready staging rehearsals
  - `npm run typecheck`
  - `npx expo install --check`
  - `git diff --check`
  - Sentry issue list for `tubton/react-native`

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
