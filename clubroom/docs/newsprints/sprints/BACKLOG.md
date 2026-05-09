# Sprint Backlog

Updated: 2026-05-09
Rule: active work only. Completed sprint rows are intentionally removed.

## Open Queue

| ID | Exactly what it does | Spine(s) | Status |
| -- | -------------------- | -------- | ------ |
| UI-LOAD-06 | Fix trust-sensitive and family surfaces: family, child, health, emergency, medical, verification, and related safeguarding-adjacent paths need strict, truthful, non-chaotic loading behavior. | Trust, Safety and Operations + Development and Analytics | READY |
| UI-LOAD-07 | Bring development and training surfaces to the same bar: drills, goals, badges, results program, progress loop, media gallery, videos, group sessions, matches, and athlete development paths must stop feeling second-class. | Development and Analytics + Community and Growth | OPEN |
| UI-LOAD-08 | Sweep ops, settings, finance, admin, and enforcement: availability, settings, invoices, payments, earnings, club setup/admin, manage, and remaining async routes must be classified and upgraded or explicitly marked static. | Trust, Safety and Operations + Booking, Availability and Revenue + Development and Analytics | OPEN |
| PROD-VERIFY-01 | Rehearse the production db-backed runtime end to end: release preflight, web export, UI flows, and the remaining non-mock critical journeys; fix code-path drift and leave only real env/provisioning blockers. | Trust/Safety/Ops + Booking/Revenue + Development | READY |

## Execution Order

1. `UI-LOAD-06`
2. `UI-LOAD-07`
3. `UI-LOAD-08`
4. `PROD-VERIFY-01`

## Active Pruning Plan

Source:

- `docs/product-reality/FEATURE_TRIAGE_BOARD_2026-05-06.md`
- `docs/newsprints/sprints/FEATURE_PRUNE_SPRINTS_2026-05-06.md`

Decision:

- Product pruning now runs before the remaining loading polish.
- Do not spend `UI-LOAD-*` effort on routes classified as `DELETE`.
- `discover/map.tsx` is protected and should be hardened as a central launch discovery path.

## Sprint Intent

- Make app navigation and loading feel launch-grade: placeholders should be visually truthful, already-loaded content should stay on screen during refresh, and fast tab or list movement should not expose blank seams.
- Finish the loading and perceived-performance pass before the next production rehearsal so UI-flow validation reflects the launch-quality behavior we actually intend to ship.

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
  - `52` app/component files using `ActivityIndicator`
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
  - latest loading coverage audit: `submit-only=4`, `section-skeleton=104`, `static=22`, `warm-first=24`
  - `scripts/loading-route-coverage-audit.js` is the route-closure gate that later slices inherit
  - later slices still need to replace generic implementations on their owned routes; classification closure is done, route-family migration is not

## Sprint Notes

### `UI-LOAD-06`

- Need:
  - Fix trust-sensitive and family surfaces where loading mistakes are especially costly to user confidence.
  - Remove cold resets and generic placeholders from medical, emergency, family, child, and verification surfaces.
  - Keep these surfaces calm, truthful, and low-chaos even when data is partial or refreshing.
- Touch first:
  - `app/family/index.tsx`
  - `app/family/calendar.tsx`
  - `app/family/recurring.tsx`
  - `app/family/sharing.tsx`
  - `app/child/[id]/medical.tsx`
  - `app/child/[id]/emergency.tsx`
  - `app/roster/[athleteId]/health.tsx`
  - `app/roster/[athleteId]/emergency.tsx`
  - `app/health/index.tsx`
  - `app/health/[id].tsx`
  - `app/health/injuries.tsx`
  - `app/verification/index.tsx`
  - `app/verification/background.tsx`
  - `app/verification/credentials.tsx`
  - `app/verification/id.tsx`
  - `app/verification/insurance.tsx`
- Acceptance:
  - Trust/family surfaces use stable shells and truthful section loading instead of abrupt full resets.
  - Verification and medical flows avoid mixed, noisy loading affordances.
  - These surfaces feel reliable and calm, not theatrical.
- Hard fail if:
  - Any trust-sensitive screen flashes blank after prior data was shown.
  - A medical or verification route still looks like a generic settings page during load.
  - A trust-sensitive interaction gives the user no immediate acknowledgement after tap.
- Verify:
  - `npm run typecheck`
  - `npm run test:compile`
  - `npm run ui:flows:parent-core`
  - `npm run ui:flows:trust-core`
  - `git diff --check`

### `UI-LOAD-07`

- Need:
  - Bring retained development and training surfaces to the same premium bar.
  - Remove second-class loading from progress loop, media, video, group session, and match flows after pruning removed standalone goals, drills, skills, journal, and badge galleries.
- Touch first:
  - remaining `app/development/*`
  - `app/videos/[id].tsx`
  - `app/videos/upload.tsx`
  - `app/group-sessions/*`
  - `app/matches/*`
- Acceptance:
  - Development and training surfaces no longer rely on generic list/detail placeholders where the real UI is richer.
  - Results, drill, media, and progression surfaces feel as intentional as commerce and social surfaces.
  - Video and media flows distinguish between entry loading, upload progress, and post-load state truthfully.
- Hard fail if:
  - Training and development screens still feel like an afterthought compared with Bookings or Feed.
  - Upload/progress surfaces fake progress or use dead placeholders that do not match backend reality.
  - Development flows still look structurally unstable under latency even when the data is technically correct.
- Verify:
  - `npm run typecheck`
  - `npm run test:compile`
  - `npm run ui:flows:athlete-core`
  - `npm run ui:flows:coach-core`
  - `git diff --check`

### `UI-LOAD-08`

- Need:
  - Sweep ops, settings, finance, admin, and the remaining async surfaces so route coverage is actually closed.
  - Upgrade or explicitly classify availability, settings, invoices, payments, earnings, manage, club admin, and remaining form-heavy routes.
  - Wire enforcement into docs and audits so regressions are easier to spot.
- Touch first:
  - `app/(tabs)/availability.tsx`
  - `app/(tabs)/earnings.tsx`
  - `app/earnings.tsx`
  - `app/invoices/*`
  - `app/settings/*`
  - `app/manage/*`
  - `app/(tabs)/admin/*`
  - `app/club/create.tsx`
  - `app/club/settings.tsx`
  - `app/club/setup-complete.tsx`
  - `docs/ui/loading-error-empty-state-matrix.md`
  - any relevant UI audit script that can honestly enforce the new rules
- Acceptance:
  - Shared loading rules are the default path across the active surfaces.
  - Remaining exceptions are explicitly documented and truly static or submit-only.
  - The route tree is closed: no async route remains unclassified at the end of this slice.
- Hard fail if:
  - A new or existing surface can still bypass the shared rules without an explicit documented exception.
  - The repo claims premium loading quality while any high-traffic or async route family still flashes blank between warm navigations.
  - The final sweep cannot prove route-by-route transition ownership and review evidence for the hot paths.
- Verify:
  - `npm run typecheck`
  - `npm run test:compile`
  - `npm run ui:flows:run`
  - `git diff --check`
