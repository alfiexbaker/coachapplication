# Sprint Backlog

Updated: 2026-04-20
Rule: active work only. Completed sprint rows are intentionally removed.

## Open Queue

| ID | Exactly what it does | Spine(s) | Status |
| -- | -------------------- | -------- | ------ |
| UI-LOAD-01 | Build the hard loading contract and route-coverage gate: shared primitives, retained-data refresh behavior, premium fail conditions, and a mandatory classification for every route (`warm-first`, `section-skeleton`, `submit-only`, or `static`). | Booking, Availability and Revenue + Community and Growth + Development and Analytics | READY |
| UI-LOAD-02 | Fix the commerce journey end to end: Bookings, Discover, booking funnel, booking detail/cancel, session invites, session completion/notes, and adjacent review flows must stop using generic or reset-heavy loading. | Booking, Availability and Revenue | READY |
| UI-LOAD-03 | Rebuild social and communication surfaces for premium perceived speed: home, feed, coach updates, community, messages, and related post/detail flows need truthful section loading and warm revisits. | Community and Growth + Development and Analytics | READY |
| UI-LOAD-04 | Make profile and roster detail surfaces behave like a serious product: coach, athlete, public profile, roster, compare, and other segmented panes stay warm and never blank on tab changes. | Development and Analytics + Booking, Availability and Revenue | READY |
| UI-LOAD-05 | Bring club, schedule, events, and calendar surfaces up to the same standard: no brochure skeletons, no cold resets, and no time-based screens loading like generic lists. | Community and Growth + Booking, Availability and Revenue | READY |
| UI-LOAD-06 | Fix trust-sensitive and family surfaces: family, child, health, emergency, medical, verification, and related safeguarding-adjacent paths need strict, truthful, non-chaotic loading behavior. | Trust, Safety and Operations + Development and Analytics | READY |
| UI-LOAD-07 | Bring development and training surfaces to the same bar: drills, goals, badges, results program, progress loop, media gallery, videos, group sessions, matches, and athlete development paths must stop feeling second-class. | Development and Analytics + Community and Growth | OPEN |
| UI-LOAD-08 | Sweep ops, settings, finance, admin, and enforcement: availability, settings, invoices, payments, earnings, club setup/admin, manage, and remaining async routes must be classified and upgraded or explicitly marked static. | Trust, Safety and Operations + Booking, Availability and Revenue + Development and Analytics | OPEN |
| PROD-VERIFY-01 | Rehearse the production db-backed runtime end to end: release preflight, web export, UI flows, and the remaining non-mock critical journeys; fix code-path drift and leave only real env/provisioning blockers. | Trust/Safety/Ops + Booking/Revenue + Development | READY |

## Execution Order

1. `UI-LOAD-01`
2. `UI-LOAD-02`
3. `UI-LOAD-03`
4. `UI-LOAD-04`
5. `UI-LOAD-05`
6. `UI-LOAD-06`
7. `UI-LOAD-07`
8. `UI-LOAD-08`
9. `PROD-VERIFY-01`

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
  - `190` route files under `app/`
  - `53` routes with no explicit loading signal found at the route file level
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
  - the previous sprint pack covered the hot surfaces, but it did not yet prove route-by-route closure for booking funnel, trust/family, development/training, or ops/settings families
  - `UI-LOAD-01` must produce the classification and implementation gate before later slices can honestly claim full coverage

## Sprint Notes

### `UI-LOAD-01`

- Need:
  - Consolidate the current split between `components/ui/screen-states-sections.tsx`, `components/ui/skeleton.tsx`, and `components/primitives/surface-card.tsx`.
  - Extend `hooks/use-screen.ts` and `hooks/use-screen-core.ts` so screens can keep previous data visible during focus refresh, event refresh, and retry paths.
  - Define the non-negotiable fidelity rule: a placeholder must be a layout twin of the surface it replaces.
  - Remove the ability for hot screens to hide behind a generic fallback when a screen-specific loading recipe is required.
  - Create and enforce the route classification rule so every async route has an explicit loading strategy.
- Touch first:
  - `hooks/use-screen.ts`
  - `hooks/use-screen-core.ts`
  - `components/ui/screen-states.tsx`
  - `components/ui/screen-states-sections.tsx`
  - `components/ui/skeleton.tsx`
  - `docs/ui/loading-error-empty-state-matrix.md`
- Acceptance:
  - Full-screen loading only happens on true first load with no prior data.
  - Shared loading recipes exist for feed, card grid, detail hero, form, schedule, and tab-pane sections.
  - Migrated screens can render stale data with a silent refresh path instead of dropping back to a blank loader.
  - A screen cannot claim compliance unless its loading recipe and loaded recipe share the same container density and hierarchy.
  - Every later sprint slice inherits a route list or route family list; no “catch-all later” language is allowed without named paths.
  - The program defines and enforces visible transition rules so paths preserve a stable frame from click to resolved content.
  - The program produces an elite review checklist for hot paths: cold open, warm revisit, background refresh, stressed-latency pass.
- Hard fail if:
  - Any hot-path surface still requires both `LoadingState` and a bespoke inline spinner to feel complete.
  - The shared system cannot express section-level loading without blanking the whole screen.
  - The route tree still contains async paths that are unclassified when `UI-LOAD-01` closes.
  - The system still allows `click -> blank/flicker -> load -> show` on warmed paths.
  - The foundation ships without a route manifest and review method strong enough to catch visible regressions.
- Verify:
  - `npm run typecheck`
  - `npm run test:compile`
  - `git diff --check`

### `UI-LOAD-02`

- Need:
  - Move Bookings and Discover off generic `LoadingState variant="list"` when the real surface is multi-section and mixed-density.
  - Ensure section-level placeholders use the same card families, chip rows, and list lengths that the loaded surface will use.
  - Remove tab-switch and pull-to-refresh blanking for the Bookings stack.
  - Treat these surfaces as premium retail surfaces: no fake density, no generic bars, no excuses.
  - Cover the rest of the booking/session journey, not just the landing tab.
- Touch first:
  - `app/(tabs)/bookings/index.tsx`
  - `app/book-coach.tsx`
  - `app/book/[coachId]/index.tsx`
  - `app/book/[coachId]/details.tsx`
  - `app/book/[coachId]/schedule.tsx`
  - `app/book/[coachId]/session-type.tsx`
  - `app/book/[coachId]/review.tsx`
  - `app/book/[coachId]/multi-week.tsx`
  - `app/(tabs)/bookings/[id].tsx`
  - `app/booking/[id]/cancel.tsx`
  - `app/session-invites/[id].tsx`
  - `app/session-invites/index.tsx`
  - `app/session/[id]/rsvp.tsx`
  - `app/session/[id]/complete.tsx`
  - `app/session-notes/[bookingId].tsx`
  - `app/review/[bookingId].tsx`
  - `app/rate-coach.tsx`
  - `components/bookings/discover-feed.tsx`
  - `components/bookings/BookingsList.tsx`
  - `hooks/use-bookings.ts`
  - `hooks/use-bookings-discover.ts`
- Acceptance:
  - Returning to Bookings or Discover keeps prior content visible while refresh happens in the background.
  - Discover placeholders mirror pending invites, week cards, coach cards, and group-session rows rather than generic lines.
  - Loading becomes section-scoped where only part of the screen is pending.
  - Pull-to-refresh does not destroy the visual structure or scroll feel of the loaded surface.
- Hard fail if:
  - Switching between `My Sessions` and `Discover` causes a full repaint or blank shell.
  - Bookings shows a generic list skeleton while the real screen is a mixed filter-and-card composition.
  - Any step in the book/session journey regresses to a dead spinner or blank route while moving between steps.
  - The booking funnel feels acknowledged late after tap, even if the data eventually loads correctly.
- Verify:
  - `npm run typecheck`
  - `npm run test:compile`
  - `npm run ui:flows:parent-core`
  - `npm run ui:flows:athlete-core`
  - `git diff --check`

### `UI-LOAD-03`

- Need:
  - Rebuild social, home, and messaging surfaces so revisits feel immediate and feed rows load truthfully.
  - Remove giant top-level resets from feed-like experiences.
  - Replace decorative placeholders with row-accurate section loading.
- Touch first:
  - `app/(tabs)/index.tsx`
  - `app/(tabs)/feed.tsx`
  - `app/(tabs)/messages.tsx`
  - `app/community/index.tsx`
  - `app/community/[groupId].tsx`
  - `app/(modal)/post-detail.tsx`
  - `app/(modal)/create-post.tsx`
  - `app/(modal)/create-club-post.tsx`
  - `components/user/home-screen.tsx`
  - `components/coach/profile-tab-posts.tsx`
- Acceptance:
  - Feed and messaging surfaces preserve visible content during refresh.
  - Post, thread, and community list placeholders map to the loaded row or card shapes.
  - Home/feed/community/messages share one coherent loading language instead of mixed generic variants and spinners.
- Hard fail if:
  - A feed row or chat/thread list still flashes empty before warmed data appears.
  - Social surfaces still combine row skeletons with random spinners in the same viewport.
  - Feed interactions do not acknowledge tap immediately through stable context, pressed state, or retained frame.
- Verify:
  - `npm run typecheck`
  - `npm run test:compile`
  - `npm run ui:flows:coach-core`
  - `npm run ui:flows:parent-core`
  - `git diff --check`

### `UI-LOAD-04`

- Need:
  - Make segmented and comparison-heavy detail surfaces preserve loaded panes and act warm.
  - Fix profile, roster, athlete detail, compare, and similar route families where tab switches or detail refreshes still feel cold.
- Touch first:
  - `app/(tabs)/coach-profile.tsx`
  - `app/(tabs)/athletes.tsx`
  - `app/roster/index.tsx`
  - `app/roster/[athleteId]/index.tsx`
  - `app/development/child-progress/[childId].tsx`
  - `app/compare/index.tsx`
  - `app/compare/[ids].tsx`
  - `app/coach/[id].tsx`
  - `app/coach/[coachId]/public.tsx`
  - `app/profile/[userId].tsx`
  - `components/coach/profile-tabs.tsx`
  - `components/athlete/athlete-sessions.tsx`
- Acceptance:
  - Tab switches preserve pane state and do not blank the viewport.
  - Detail screens keep stable hero and chrome while secondary panes refresh.
  - Comparison and athlete-detail paths use pane-specific placeholders instead of generic detail loaders.
- Hard fail if:
  - A warmed profile or roster pane still reruns a cold full-screen loader.
  - Segmented surfaces still act like separate page navigations under the hood.
  - Switching panes feels like waiting for a fetch instead of revealing already-owned UI.
- Verify:
  - `npm run typecheck`
  - `npm run test:compile`
  - `npm run ui:flows:coach-core`
  - `npm run ui:flows:athlete-core`
  - `git diff --check`

### `UI-LOAD-05`

- Need:
  - Bring schedule, events, club, and calendar surfaces up to the same standard: no brochure skeletons, no cold resets, no slow mixed scroll stacks pretending to be fine.
  - Remove generic placeholder treatment from time-based surfaces where density and hierarchy matter.
  - Fix the remaining “looks loaded but feels cheap” screens.
- Touch first:
  - `components/club/ClubScheduleScreen.tsx`
  - `app/events/index.tsx`
  - `app/events/[id].tsx`
  - `app/club/[id].tsx`
  - `app/club/[clubId]/calendar.tsx`
  - `app/(tabs)/schedule.tsx`
  - `app/club/[id]/schedule.tsx`
  - `app/club/squad/[id]/schedule.tsx`
  - `app/club/training-schedule.tsx`
- Acceptance:
  - Schedule and event placeholders reflect the real time-grid, card, or agenda structure that loads afterward.
  - Club and event surfaces preserve headers and already-loaded sections during refresh.
  - Remaining list or calendar seams do not read as second-class compared with Bookings or Feed.
- Hard fail if:
  - Calendar or schedule surfaces still drop to generic bars while the final UI is date-structured.
  - Club or event detail refresh wipes out the header and action chrome.
  - Time-based flows visibly jump or reshuffle before resolved content is ready.
- Verify:
  - `npm run typecheck`
  - `npm run test:compile`
  - `npm run ui:flows:coach-core`
  - `npm run ui:flows:parent-core`
  - `git diff --check`

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
  - `app/family/spending.tsx`
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
  - Bring development and training surfaces to the same premium bar.
  - Remove second-class loading from drills, goals, badges, results program, progress loop, media, video, group session, and match flows.
- Touch first:
  - `app/drills/*`
  - `app/goals/*`
  - `app/badges/index.tsx`
  - `app/children/badges/[childId].tsx`
  - `app/development/*`
  - `app/results-program.tsx`
  - `app/videos/[id].tsx`
  - `app/videos/upload.tsx`
  - `app/group-sessions/*`
  - `app/matches/*`
  - `app/athlete/journal.tsx`
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
  - `app/payments/index.tsx`
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
