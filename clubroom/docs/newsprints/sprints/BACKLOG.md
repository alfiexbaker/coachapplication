# Sprint Backlog

Updated: 2026-04-20
Rule: active work only. Completed sprint rows are intentionally removed.

## Open Queue

| ID | Exactly what it does | Spine(s) | Status |
| -- | -------------------- | -------- | ------ |
| UI-LOAD-01 | Build the shared loading foundation: one skeleton system, one stale-while-revalidate screen contract, and one fidelity rule so placeholders match the real surface they stand in for. | Booking, Availability and Revenue + Community and Growth + Development and Analytics | READY |
| UI-LOAD-02 | Migrate the highest-traffic bookings and discovery surfaces to retained-data loading, section-level placeholders, and shape-matched lazy states; remove cold-load flashes from Bookings, Discover, and adjacent feed entry points. | Booking, Availability and Revenue + Community and Growth | READY |
| UI-LOAD-03 | Keep profile and roster tab surfaces warm so switching tabs does not remount blank panes; make coach profile, athlete profile, and similar segmented surfaces preserve loaded data and show tab-local loading only when truly needed. | Development and Analytics + Booking, Availability and Revenue | READY |
| UI-LOAD-04 | Tune list virtualization and section loading across feed, club, event, schedule, and community surfaces; replace obvious scroll bottlenecks and remove heavyweight loading effects that fight fast flicking. | Community and Growth + Development and Analytics | OPEN |
| UI-LOAD-05 | Sweep remaining bespoke loaders, align wrappers and audits to the shared contract, and finish the app-wide consistency pass before the next release rehearsal. | Development and Analytics + Trust, Safety and Operations | OPEN |
| PROD-VERIFY-01 | Rehearse the production db-backed runtime end to end: release preflight, web export, UI flows, and the remaining non-mock critical journeys; fix code-path drift and leave only real env/provisioning blockers. | Trust/Safety/Ops + Booking/Revenue + Development | READY |

## Execution Order

1. `UI-LOAD-01`
2. `UI-LOAD-02`
3. `UI-LOAD-03`
4. `UI-LOAD-04`
5. `UI-LOAD-05`
6. `PROD-VERIFY-01`

## Sprint Intent

- Make app navigation and loading feel launch-grade: placeholders should be visually truthful, already-loaded content should stay on screen during refresh, and fast tab or list movement should not expose blank seams.
- Finish the loading and perceived-performance pass before the next production rehearsal so UI-flow validation reflects the launch-quality behavior we actually intend to ship.

## Sprint Notes

### `UI-LOAD-01`

- Need:
  - Consolidate the current split between `components/ui/screen-states-sections.tsx`, `components/ui/skeleton.tsx`, and `components/primitives/surface-card.tsx`.
  - Extend `hooks/use-screen.ts` and `hooks/use-screen-core.ts` so screens can keep previous data visible during focus refresh, event refresh, and retry paths.
  - Define the non-negotiable fidelity rule: a placeholder must be a layout twin of the surface it replaces.
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
- Verify:
  - `npm run typecheck`
  - `npm run test:compile`
  - `git diff --check`

### `UI-LOAD-02`

- Need:
  - Move Bookings and Discover off generic `LoadingState variant="list"` when the real surface is multi-section and mixed-density.
  - Ensure section-level placeholders use the same card families, chip rows, and list lengths that the loaded surface will use.
  - Remove tab-switch and pull-to-refresh blanking for the Bookings stack.
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
- Touch first:
  - `app/(tabs)/feed.tsx`
  - `components/user/home-screen.tsx`
  - `components/club/ClubScheduleScreen.tsx`
  - `app/events/index.tsx`
  - other top-scroll-cost surfaces discovered during audit
- Acceptance:
  - High-traffic surfaces no longer rely on whole-page `ScrollView` when they are effectively feeds.
  - Loading effects do not degrade scroll feel on long lists.
  - Any remaining `ScrollView` surfaces are intentional and justified by low item count or non-feed structure.
- Verify:
  - `npm run typecheck`
  - `npm run test:compile`
  - `npm run ui:flows:coach-core`
  - `npm run ui:flows:parent-core`
  - `git diff --check`

### `UI-LOAD-05`

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
- Verify:
  - `npm run typecheck`
  - `npm run test:compile`
  - `npm run ui:flows:run`
  - `git diff --check`
