# P3 Components A Plan

> Date: 2026-02-11
> Phase: Foundation Phase 3 (Screen Infrastructure)
> Sprint Anchor: `docs/sprints/CompletedSprints/SPRINT-43-PHASE-3-WAVE-1.md`
> Live Tracker: `docs/sprints/Foundation/PHASE-3-LIVE-TRACKER.md`
> Source of truth: `docs/SOURCE_OF_TRUTH.md`, `docs/sprints/Foundation/PHASE-3-SCREEN-INFRASTRUCTURE.md`
> Status: COMPLETE

## Persistence Contract

- This file is the persistent execution memory for Phase 3 Components A.
- It must be updated after every completed batch to avoid context loss.
- The **Current Checkpoint** and **Execution Log** are the first source to resume work.

## Current Checkpoint

- Last Updated: `2026-02-11 08:20:26 GMT`
- Phase 2 status: complete and verified.
- Phase 3 docs status:
  - `docs/sprints/Foundation/PHASE-3-LIVE-TRACKER.md` created.
  - Sprint/index docs linked to Phase 3 tracker.
- Sprint 43 status: complete (Track A + Wave 1 checklist + validation gates).
- Wave 2 status: complete (`W2` checklist fully checked in Phase 3 tracker).
- Wave 3 status: complete (`W3` checklist fully checked in Phase 3 tracker).
- Wave 4 status: complete (all `W4` checklist routes now marked `DONE` in the live tracker).
- Wave 5 status: complete (`W5` checklist fully checked and marked `DONE` in live tracker).
- Wave 6 status: complete (`189 / 189 DONE`, `0` routes remaining).
- Next action: Phase 3 complete; maintain tracker and move to next sprint scope.

## Execution Log

- `2026-02-11 03:31:17 GMT` - Initialized persistent checkpointing in this file; set resume point to Workstream 1 infra implementation.
- `2026-02-11 03:32:07 GMT` - Revalidated persistence checkpoint/log sections and confirmed resume point remains Workstream 1 infra implementation.
- `2026-02-11 03:39:36 GMT` - Completed Workstream 1 (`useScreen` focus-refetch, `combineResults`, focused tests) and passed typecheck + test compile gates.
- `2026-02-11 03:45:51 GMT` - Started Workstream 3: `app/(tabs)/messages.tsx` + `app/chat/[threadId].tsx` migrated to `useScreen` 4-state pattern; `app/bookings/[id]/counter.tsx` + `app/bookings/[id]/negotiate.tsx` loading/error/empty standardized (full data migration still pending).
- `2026-02-11 03:55:43 GMT` - Completed full `useScreen` data migration for `app/bookings/[id]/counter.tsx` and `app/bookings/[id]/negotiate.tsx` via `hooks/use-counter-offer.ts` and `hooks/use-negotiate.ts`.
- `2026-02-11 03:56:25 GMT` - Re-ran validation gates after hook migration: typecheck/test-typecheck passed and `npm run test:bookings` passed.
- `2026-02-11 03:59:20 GMT` - Migrated notifications stack to `useScreen` contract (`hooks/use-notifications.ts` + `components/notification/notifications-panel.tsx`) and passed notification-preferences runtime tests.
- `2026-02-11 04:03:19 GMT` - Reconciled Sprint 43 checklist statuses with live tracker (`athletes`, `feed`, `badges` marked `IN_PROGRESS`) to keep progress reporting consistent.
- `2026-02-11 04:16:59 GMT` - Migrated `app/(tabs)/schedule.tsx` (via `hooks/use-schedule.ts`), `app/(tabs)/index.tsx`, and `app/(tabs)/profile.tsx`; re-ran typecheck/test-typecheck plus bookings/calendar runtime suites.
- `2026-02-11 04:25:16 GMT` - Completed Wave 2 migration for `app/bookings/recurring.tsx` and `app/bookings/subscribe.tsx` (via `hooks/use-subscribe.ts`), verified typecheck + test-typecheck, and passed targeted runtime smoke for bookings/invite/family/community/messaging/recurring services.
- `2026-02-11 04:31:48 GMT` - Completed Wave 2 migration for `app/book/[coachId]/schedule.tsx`, `app/book/[coachId]/review.tsx`, `app/book/[coachId]/multi-week.tsx` and `hooks/use-multi-week.ts`; validated with full typecheck/test-typecheck and bookings runtime smoke.
- `2026-02-11 04:34:53 GMT` - Migrated cancellation flow (`hooks/use-booking-cancel.ts` + `app/booking/[id]/cancel.tsx`) to `useScreen` with explicit loading/error/empty/success states, refresh support, and no screen-level `ActivityIndicator`; passed full typecheck/test-typecheck plus bookings+invite runtime smoke.
- `2026-02-11 04:36:57 GMT` - Closed remaining Wave 2 `session-invites` in-progress items (`app/session-invites/index.tsx`, `app/session-invites/[id].tsx`) by adding explicit empty-state handling and pull-to-refresh wiring; verified full typecheck + test-typecheck.
- `2026-02-11 04:40:11 GMT` - Migrated bookings tab data path to `useScreen` (`hooks/use-bookings.ts`, `app/(tabs)/bookings/index.tsx`, `components/bookings/BookingsList.tsx`), including event-driven refresh and list pull-to-refresh; verified full typecheck/test-typecheck and bookings runtime smoke.
- `2026-02-11 04:42:12 GMT` - Migrated `book-coach` availability loading to `useScreen` (`hooks/use-book-coach.ts`, `app/book-coach.tsx`) with shared loading/error/empty state components and refresh wiring; revalidated typecheck + test-typecheck.
- `2026-02-11 04:54:52 GMT` - Completed Sprint 43 Wave 1 outstanding tabs (`availability`, `earnings`, `children`, `club-hub`, `wallet`, `settings`, `coach-profile`, `more`, `edit-profile`), fixed `use-children-hub` render-time state update bug, added club-hub pull-to-refresh, and passed typecheck + strict test-typecheck + targeted runtime smoke (`bookings`, `messaging`, `family`, `invite`, `community`).
- `2026-02-11 05:19:13 GMT` - Closed all remaining Wave 2 `NOT_STARTED` routes (20/20) and marked them `DONE` in the Phase 3 tracker; key migrations included `useScreen` conversions for invite-codes, booking-detail, objectives, statistics, waitlist screens, and session RSVP flow. Revalidated with full typecheck + strict test-typecheck.
- `2026-02-11 05:41:24 GMT` - Completed all 21 Wave 3 routes and marked all `W3` checklist items `DONE` in the live tracker. Migrated hooks/screens for coach invites, invites, earnings, family, child badges, invoices, payment, referrals, roster, and wallet promo to explicit `useScreen`-driven state handling, then revalidated with full typecheck + strict test-typecheck + runtime smoke over bookings/invite/family/community suites.
- `2026-02-11 06:08:15 GMT` - Started Wave 4 and completed all 6 academy routes (`app/academy/[id].tsx`, branding/settings/staff, create, join). Added explicit 4-state contracts for create/join and fixed stale form hydration in academy branding/settings by syncing form state after academy load. Revalidated with full typecheck + strict test-typecheck.
- `2026-02-11 06:13:05 GMT` - Completed all 5 availability routes (`add-template`, `block-date`, `calendar`, `edit-template`, `scheduling-rules`) and marked them `DONE` in the live tracker. Upgraded availability hooks (`use-availability-calendar`, `use-edit-template`, `use-scheduling-rules`) to `useScreen`-driven loading and wired screen-level loading/error/empty/refresh states. Revalidated with full typecheck + strict test-typecheck and calendar runtime suite.
- `2026-02-11 06:22:36 GMT` - Completed Wave 4 club/community/events batch: migrated `hooks/use-carpool.ts`, `hooks/use-community-hub.ts`, `hooks/use-club-dashboard.ts` to `useScreen` state machine and updated `app/carpool/index.tsx`, `app/community/index.tsx`, `app/events/index.tsx`, and `app/club/[clubId]/dashboard.tsx` to explicit `loading/error/empty/success` branches; reviewed static `app/club/[clubId]/_layout.tsx` and marked it done. Fixed a latent carpool create-flow bug by checking service Result before success UI, then revalidated with full typecheck + strict test-typecheck + targeted runtime smoke over bookings/invite/family/community suites.
- `2026-02-11 06:30:27 GMT` - Completed Wave 4 event/community/club detail batch: migrated `hooks/use-event-detail.ts`, `hooks/use-event-attendees.ts`, and `hooks/use-event-rsvp.ts` to `useScreen` contract; updated `app/events/[id].tsx`, `app/events/[id]/attendees.tsx`, `app/events/[id]/rsvp.tsx`, `app/events/create.tsx`, `app/community/[groupId].tsx`, and `app/club/[clubId]/branding.tsx` to explicit `loading/error/empty/success` handling with retry and refresh wiring. Revalidated with full typecheck + strict test-typecheck + targeted runtime smoke over events/community/bookings/invite/family suites.
- `2026-02-11 06:49:12 GMT` - Completed Wave 4 club/group/matches batch and backfilled tracker status drift: marked all pending club management routes done (`app/club/[clubId]/calendar.tsx`, `app/club/[clubId]/member/[memberId].tsx`, `app/club/[id].tsx`, `app/club/create.tsx`, `app/club/invite-members.tsx`, `app/club/settings.tsx`, `app/club/squad/[id].tsx`, `app/club/squad/create.tsx`, `app/club/training-schedule.tsx`), migrated group sessions hooks/screens to `useScreen` (`hooks/use-group-sessions.ts`, `hooks/use-group-session.ts`, `hooks/use-group-roster.ts`, `app/group-sessions/index.tsx`, `app/group-sessions/[id].tsx`, `app/group-sessions/[id]/roster.tsx`, `app/group-sessions/create.tsx`), and migrated matches hooks/screens to `useScreen` (`hooks/use-matches-screen.ts`, `hooks/use-match-detail.ts`, `app/matches/index.tsx`, `app/matches/[id].tsx`, `app/matches/create.tsx`). Revalidated with full typecheck + strict test-typecheck + targeted runtime smoke over bookings/invite/family/community/events (all pass). Optional squad-group test currently fails in existing member-name assertions in `squad-group-service` domain (not touched in this batch).
- `2026-02-11 06:52:45 GMT` - Revalidated after final cleanup pass (unused style/import removals in matches screens): full typecheck, strict test-typecheck, and targeted runtime smoke (`events/community/bookings/invite/family`) all pass.
- `2026-02-11 07:02:41 GMT` - Closed remaining Wave 4 ops surfaces: migrated `app/review/[bookingId].tsx` to `useScreen` with explicit `loading/error/empty/success` branches + pull-to-refresh; migrated `hooks/use-squad-invite.ts` to `useScreen` and updated `app/squads/[id]/invite.tsx` to explicit state branches; migrated verification hooks (`use-verification-hub.ts`, `use-id-verification.ts`, `use-background-check.ts`, `use-credentials.ts`) to `useScreen` and updated verification screens (`app/verification/index.tsx`, `app/verification/id.tsx`, `app/verification/background.tsx`, `app/verification/credentials.tsx`) to explicit four-state rendering with refresh wiring. Revalidated with full typecheck + strict test-typecheck + targeted runtime smoke (`events/community/bookings/invite/family`) all pass.
- `2026-02-11 07:10:15 GMT` - Started Wave 5 and completed first route cluster: migrated `hooks/use-discover-sessions.ts` + `app/discover-sessions.tsx` to full 4-state contract (including pull-to-refresh and explicit empty/error branches), migrated `hooks/use-rate-coach.ts` + `app/rate-coach.tsx` + `components/review/coach-select-list.tsx` to `useScreen` with retry/refresh and removed fallback demo coaches, and migrated `hooks/use-promo-codes.ts` + `app/admin/promo-codes.tsx` + `app/admin/promo-codes/create.tsx` to `useScreen`-driven status handling with proper loading/error/empty/success states. Revalidated with full typecheck + strict test-typecheck + targeted runtime smoke (`events/community/bookings/invite/family`) all pass.
- `2026-02-11 07:17:51 GMT` - Completed Wave 5 analytics batch: migrated hooks (`use-analytics-dashboard.ts`, `use-revenue-analytics.ts`, `use-retention-analytics.ts`, `use-athlete-analytics.ts`) to `useScreen` status contract with `retry`/`onRefresh`, combined multi-source Results where required, and migrated screens (`app/analytics/dashboard.tsx`, `app/analytics/revenue.tsx`, `app/analytics/retention.tsx`, `app/analytics/[athleteId].tsx`) to explicit `loading/error/empty/success` branches with pull-to-refresh. Reviewed static `app/analytics/_layout.tsx` and marked done. Revalidated with full typecheck + strict test-typecheck + targeted runtime smoke (`events/community/bookings/invite/family`) all pass.
- `2026-02-11 07:21:42 GMT` - Completed Wave 5 discovery-map batch: migrated `app/discover/filters.tsx` and `app/discover/map.tsx` to `useScreen`-driven loading with explicit `loading/error/empty/success` branches, replaced screen-level `ActivityIndicator` usage with shared screen-state components, and wired refresh/retry behavior for discover map/filter data loads. Revalidated with full typecheck + strict test-typecheck + targeted runtime smoke (`events/community/bookings/invite/family`) all pass.
- `2026-02-11 07:47:31 GMT` - Completed Wave 5 closure batch end-to-end: migrated remaining `W5` screens/hooks across development, child safety, badges, goals, health, session notes, sessions create, skills, favourites, compare, athlete journal, and videos to explicit `loading/error/empty/success` handling with `useScreen`-aligned refresh/retry where applicable. Updated live tracker to mark all `W5` routes `DONE` (progress now `158 / 189 DONE`) and set Wave 5 plan status to `DONE`. Revalidated with full typecheck + strict test-typecheck + targeted runtime smoke (`events/community/bookings/invite/family`) all pass (`325 pass, 0 fail`).
- `2026-02-11 08:07:42 GMT` - Started Wave 6 and completed first module batch: migrated `coach` (`app/coach/[coachId]/public.tsx`, `app/coach/[id].tsx`), `drills` (`app/drills/[id].tsx`, `assign.tsx`, `challenges.tsx`, `index.tsx`, `library.tsx`) and `packages` (`app/packages/[id].tsx`, `index.tsx`, `manage.tsx`) to explicit `useScreen`-driven state contracts with retry/refresh and shared loading/error/empty components. Refactored related hooks (`use-public-profile`, `use-coach-detail`, `use-drills-screen`, `use-drill-assign`, `use-drill-library`, `use-package-detail`, `use-package-manage`) to `useScreen` load flows. Removed challenge seed fallback path from runtime screen logic. Revalidated with full typecheck + strict test-typecheck + compile and targeted runtime smoke (`bookings/invite/family/community`) all pass (`275 pass, 0 fail`). Updated live tracker to `168 / 189 DONE` (`Wave 6: IN_PROGRESS`).
- `2026-02-11 08:20:26 GMT` - Closed Wave 6 and completed Phase 3: migrated remaining dynamic W6 surfaces (`hooks/use-calendar-sync.ts`, `app/settings/calendar-sync.tsx`, `hooks/use-coaching-settings.ts`, `app/settings/coaching.tsx`, `hooks/use-notification-prefs.ts`, `app/settings/notifications/preferences.tsx`, `app/(modal)/create-post.tsx`) to explicit `useScreen` status contracts with retry/refresh and shared loading/error state components; reviewed/validated remaining W6 static routes (`add-child`, `create-club-post`, `create-squad`, root/settings layouts, legal/help/account/privacy/settings index, drills create flows) and marked all `W6` checklist routes `DONE`. Revalidated with full typecheck + strict test-typecheck + `npm run test:compile` + targeted runtime smoke (`bookings/invite/family/community`) all pass (`275 pass, 0 fail`). Updated live tracker to `189 / 189 DONE` and set Wave 6 status to `DONE`.

## Objective

Ship the first execution slice of Phase 3 by standardizing screen-state behavior in high-traffic surfaces:
- `useScreen` supports focus refetch.
- multi-source Result composition exists.
- selected Wave 1 screens use the 4-state pattern (`loading`, `error`, `empty`, `success`) with pull-to-refresh.

## Non-Goals

- No UI redesign.
- No component decomposition/polish work (that is Phase 4).
- No feature expansion.

## Scope A (This Plan)

### Workstream 1: Core Hook and Result Infra

- [x] Add `refetchOnFocus?: boolean` to `UseScreenOptions` in `hooks/use-screen.ts`.
- [x] Implement focus-triggered silent refetch when `refetchOnFocus` is true.
- [x] Add `combineResults()` helper to `types/result.ts` for multi-source screen loads.
- [x] Add tests for:
  - `useScreen` focus refetch behavior.
  - `combineResults` success + first-error short-circuit behavior.

### Workstream 2: Shared State Components Usage Contract

- [x] Confirm screen-state primitives in `components/ui/screen-states.tsx` are the default path:
  - `LoadingState`
  - `ErrorState`
  - `EmptyState` (re-exported via `screen-states`)
- [x] Enforce migration contract:
  - no direct screen-level `ActivityIndicator` for main data load.
  - `ErrorState` includes retry handler.
  - `EmptyState` message is specific to user action/context.

### Workstream 3: Wave 1 Screen Batch (Components A)

Batch order (high traffic first):
- [x] `app/(tabs)/index.tsx`
- [x] `app/(tabs)/schedule.tsx`
- [x] `app/(tabs)/messages.tsx`
- [x] `app/(tabs)/notifications.tsx`
- [x] `app/(tabs)/profile.tsx`
- [x] `app/(tabs)/roster.tsx`
- [x] `app/bookings/[id]/counter.tsx`
- [x] `app/bookings/[id]/negotiate.tsx`
- [x] `app/chat/[threadId].tsx`

Per-screen definition of done:
- [x] Data load uses `useScreen` only.
- [x] 4-state branches are explicit.
- [x] RefreshControl wired to `onRefresh` when scrollable.
- [x] Event subscriptions are explicit and minimal.

### Workstream 4: Verification

- [x] `NODE_OPTIONS=--max-old-space-size=8192 npx tsc -p tsconfig.typecheck.json --pretty false`
- [x] `NODE_OPTIONS=--max-old-space-size=8192 npx tsc -p tsconfig.test.json --pretty false`
- [x] `npm run test:compile`
- [x] targeted runtime tests for touched domains:
  - bookings (service smoke done)
  - messaging/chat (service smoke done)
  - family/invite/community (service smoke done)

## Risks and Mitigations

- Risk: introducing regressions in screens with mixed local state + service calls.
  - Mitigation: migrate one screen at a time; run typecheck every 2-3 screens.
- Risk: over-subscribing event bus and causing noisy refetch.
  - Mitigation: only subscribe to domain events that mutate visible data.
- Risk: scope creep into visual refactors.
  - Mitigation: defer all styling/layout refactors to Phase 4 docs.

## Exit Criteria (Components A)

- Workstream 1 complete.
- All listed Wave 1 screens migrated and passing definition of done.
- All verification commands pass.
- Sprint tracker updated in:
  - `docs/sprints/CompletedSprints/SPRINT-43-PHASE-3-WAVE-1.md`
  - `docs/sprints/Foundation/PHASE-3-SCREEN-INFRASTRUCTURE.md` (progress note/checklist updates)
