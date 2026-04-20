# Sprint Backlog

Updated: 2026-04-20
Rule: active work only. Completed sprint rows are intentionally removed.

## Open Queue

| ID | Exactly what it does | Spine(s) | Status |
| -- | -------------------- | -------- | ------ |
| UI-LOAD-01 | Build the hard loading contract and shared primitives: one loading architecture, retained-data refresh behavior, premium fail conditions, and zero tolerance for fake or generic placeholders on hot paths. | Booking, Availability and Revenue + Community and Growth + Development and Analytics | READY |
| UI-LOAD-02 | Fix the biggest lie in the app first: Bookings and Discover must stop showing generic or reset-heavy loading states and must render truthful, section-specific placeholders that match the real cards and counts. | Booking, Availability and Revenue + Community and Growth | READY |
| UI-LOAD-03 | Make segmented and tabbed detail surfaces behave like a serious product: profile, roster, and similar panes stay warm, preserve loaded data, and never blank the viewport on simple tab changes. | Development and Analytics + Booking, Availability and Revenue | READY |
| UI-LOAD-04 | Rebuild feed-style surfaces for premium perceived speed: home, feed, coach updates, and community surfaces need virtualization, section retention, and loading that does not fight fast flicking. | Community and Growth + Development and Analytics | READY |
| UI-LOAD-05 | Bring schedule, events, club, and calendar surfaces up to the same standard: no brochure skeletons, no cold resets, no slow mixed scroll stacks pretending to be fine. | Community and Growth + Booking, Availability and Revenue | OPEN |
| UI-LOAD-06 | Sweep the remaining bespoke loaders, wire enforcement into docs and audits, and fail any surface that still uses loading behavior that looks improvised or cheap. | Development and Analytics + Trust, Safety and Operations | OPEN |
| PROD-VERIFY-01 | Rehearse the production db-backed runtime end to end: release preflight, web export, UI flows, and the remaining non-mock critical journeys; fix code-path drift and leave only real env/provisioning blockers. | Trust/Safety/Ops + Booking/Revenue + Development | READY |

## Execution Order

1. `UI-LOAD-01`
2. `UI-LOAD-02`
3. `UI-LOAD-03`
4. `UI-LOAD-04`
5. `UI-LOAD-05`
6. `UI-LOAD-06`
7. `PROD-VERIFY-01`

## Sprint Intent

- Make app navigation and loading feel launch-grade: placeholders should be visually truthful, already-loaded content should stay on screen during refresh, and fast tab or list movement should not expose blank seams.
- Finish the loading and perceived-performance pass before the next production rehearsal so UI-flow validation reflects the launch-quality behavior we actually intend to ship.

## Premium Bar

- If a surface has loaded once, dropping the whole screen back to a blank skeleton is a failure.
- If a placeholder does not match the loaded layout family, it is a failure.
- If a tab switch causes a visible white flash, empty pane, or full reset, it is a failure.
- If a long list stutters because the loading treatment is too heavy, it is a failure.
- If a feed-style surface still relies on a generic `ScrollView` without a strong reason, it is a failure.
- If loading looks decorative instead of truthful, it is a failure.

## Sprint Notes

### `UI-LOAD-01`

- Need:
  - Consolidate the current split between `components/ui/screen-states-sections.tsx`, `components/ui/skeleton.tsx`, and `components/primitives/surface-card.tsx`.
  - Extend `hooks/use-screen.ts` and `hooks/use-screen-core.ts` so screens can keep previous data visible during focus refresh, event refresh, and retry paths.
  - Define the non-negotiable fidelity rule: a placeholder must be a layout twin of the surface it replaces.
  - Remove the ability for hot screens to hide behind a generic fallback when a screen-specific loading recipe is required.
- Touch first:
  - `hooks/use-screen.ts`
  - `hooks/use-screen-core.ts`
  - `components/ui/screen-states.tsx`
  - `components/ui/screen-states-sections.tsx`
  - `components/ui/skeleton.tsx`
- Acceptance:
  - Full-screen loading only happens on true first load with no prior data.
  - Shared loading recipes exist for feed, card grid, detail hero, form, schedule, and tab-pane sections.
  - Migrated screens can render stale data with a silent refresh path instead of dropping back to a blank loader.
  - A screen cannot claim compliance unless its loading recipe and loaded recipe share the same container density and hierarchy.
- Hard fail if:
  - Any hot-path surface still requires both `LoadingState` and a bespoke inline spinner to feel complete.
  - The shared system cannot express section-level loading without blanking the whole screen.
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
- Touch first:
  - `app/(tabs)/bookings/index.tsx`
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
- Verify:
  - `npm run typecheck`
  - `npm run test:compile`
  - `npm run ui:flows:parent-core`
  - `npm run ui:flows:athlete-core`
  - `git diff --check`

### `UI-LOAD-03`

- Need:
  - Stop segmented and profile tabs from cold-remounting and showing blank panes when the user already visited them.
  - Make tab placeholders reflect the active pane only and reuse the same geometry as the eventual cards or lists.
  - Remove bespoke loading state in tab content that bypasses `useScreen`.
  - Preserve the illusion of immediacy: tab changes should feel like revealing already-owned UI, not navigating to another app.
- Touch first:
  - `app/(tabs)/coach-profile.tsx`
  - `components/coach/profile-tabs.tsx`
  - `components/coach/profile-tab-posts.tsx`
  - `hooks/use-coach-profile.ts`
  - `app/roster/[athleteId]/index.tsx`
  - `components/athlete/athlete-sessions.tsx`
- Acceptance:
  - Coach and athlete tab switches preserve already-loaded panes.
  - Tab content uses pane-specific placeholder geometry, not a generic full-screen detail loader.
  - Ad hoc loading state in those surfaces is replaced or wrapped by the shared loading contract.
  - Tab-local refresh does not blank sibling panes or reset the parent shell.
- Hard fail if:
  - Changing tabs flashes empty space before content appears.
  - A tab that has already loaded still reruns a full-screen skeleton on a simple revisit.
- Verify:
  - `npm run typecheck`
  - `npm run test:compile`
  - `npm run ui:flows:coach-core`
  - `npm run ui:flows:athlete-core`
  - `git diff --check`

### `UI-LOAD-04`

- Need:
  - Audit high-traffic lists and mixed `ScrollView` surfaces for virtualization, mount cost, and per-row animation overhead.
  - Convert obvious list bottlenecks to tuned `FlatList` surfaces before introducing new list tech.
  - Keep fast flicking smooth by reducing expensive loading effects and redundant re-renders in long lists.
  - Fix the surfaces that users feel most often, not the ones that are easiest to patch.
- Touch first:
  - `app/(tabs)/feed.tsx`
  - `components/user/home-screen.tsx`
  - `app/(tabs)/coach-profile.tsx`
  - `components/community/*`
  - `components/bookings/discover-sections.tsx`
- Acceptance:
  - Feed-style surfaces keep scroll smooth under fast flicking and do not show expensive placeholder churn while cells enter view.
  - Section placeholders are recycled or lightweight enough that they do not become the new performance problem.
  - Home, feed, and coach/community update surfaces share one consistent loading language.
- Hard fail if:
  - Long lists still use entry animations or heavyweight shimmer patterns that visibly fight scroll.
  - A feed row skeleton does not match the loaded row spacing and media ratios.
- Verify:
  - `npm run typecheck`
  - `npm run test:compile`
  - `npm run ui:flows:coach-core`
  - `npm run ui:flows:parent-core`
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
- Acceptance:
  - Schedule and event placeholders reflect the real time-grid, card, or agenda structure that loads afterward.
  - Club and event surfaces preserve headers and already-loaded sections during refresh.
  - Remaining list or calendar seams do not read as second-class compared with Bookings or Feed.
- Hard fail if:
  - Calendar or schedule surfaces still drop to generic bars while the final UI is date-structured.
  - Club or event detail refresh wipes out the header and action chrome.
- Verify:
  - `npm run typecheck`
  - `npm run test:compile`
  - `npm run ui:flows:coach-core`
  - `npm run ui:flows:parent-core`
  - `git diff --check`

### `UI-LOAD-06`

- Need:
  - Sweep remaining bespoke loaders and wrappers that still drift from the shared fidelity contract.
  - Align docs and lightweight audits with the new loading expectations so regressions are easier to spot.
  - Prepare the app for a more honest `PROD-VERIFY-01` run with launch-grade perceived performance.
- Touch first:
  - Remaining screens found by loader audit
  - `docs/ui/loading-error-empty-state-matrix.md`
  - any relevant UI audit script that can honestly enforce the new rules
- Acceptance:
  - Shared loading rules are the default path across the active surfaces.
  - Remaining exceptions are explicitly documented and narrow.
  - The next production rehearsal runs against the intended loading UX, not transitional placeholders.
- Hard fail if:
  - A new or existing surface can still bypass the shared rules without an explicit documented exception.
  - The repo claims premium loading quality while any high-traffic screen still flashes blank between warm navigations.
- Verify:
  - `npm run typecheck`
  - `npm run test:compile`
  - `npm run ui:flows:run`
  - `git diff --check`
