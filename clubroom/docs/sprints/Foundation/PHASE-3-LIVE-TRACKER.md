# Phase 3 Live Tracker

> **Date Opened:** 2026-02-11
> **Scope:** Phase 3 screen infrastructure migration (`useScreen`, 4-state screens, refresh, loading-state standardization)
> **Last Updated:** 2026-02-11 08:20:26 GMT

---

## Baseline

- Screen files in `app/**/*.tsx`: **189**
- Screens currently using `useScreen()`: **5**
- Screens remaining to migrate to `useScreen()`: **184**
- Screens importing `ActivityIndicator`: **42**
- `useState(true)` loading-pattern matches in `app/`: **36**

## Current Snapshot

- Wave 0 (baseline capture): **DONE**
- Wave 1 (hook/result infra): **DONE**
- Wave 2 (P0 core navigation + booking): **DONE**
- Wave 3 (P1 revenue + roster + family): **DONE**
- Wave 5 (P2/P3 development + discovery + video): **DONE**
- Wave 6 (remaining routes + final gates): **DONE**
- Checklist progress: **189 / 189 DONE**
- Typecheck gate: **PASS (2026-02-11 08:20 batch)**
- Strict test-typecheck gate: **PASS (2026-02-11 08:20 batch)**
- Targeted runtime smoke (bookings/invite/family/community): **PASS (2026-02-11 08:20 batch)**

## Progress States

- `NOT_STARTED`: Work not begun
- `IN_PROGRESS`: Active migration underway
- `BLOCKED`: Waiting on dependency/decision
- `DONE`: Migrated and verified

## Wave Plan

| Wave | Status | Scope |
|---|---|---|
| Wave 0 - Baseline and Guardrails | DONE | Lock current counts, tracker, and sequencing. |
| Wave 1 - Hook/Result Infra | DONE | `useScreen` focus refetch + `combineResults` + tests. |
| Wave 2 - P0 Core Navigation + Booking | DONE | `(tabs)` + booking/chat/session-invite core flow screens completed. |
| Wave 3 - P1 Revenue + Roster + Family | DONE | earnings/invoices/wallet/roster/family + adjacent ops. |
| Wave 4 - P2 Club + Community + Events/Ops | DONE | club/community/events/availability/matches/group/academy/verification/review/squads-invite. |
| Wave 5 - P2/P3 Development + Discovery + Video | DONE | development/skills/videos/goals/health/analytics/discover. |
| Wave 6 - Remaining Routes + Final Gates | DONE | modals/root leftovers + full compile/test gates. |

## Sprint Links

- Phase doc: `docs/sprints/Foundation/PHASE-3-SCREEN-INFRASTRUCTURE.md`
- Sprint kickoff: `docs/sprints/Foundation/SPRINT-43-PHASE-3-WAVE-1.md`
- Execution memory: `memory/Sprints/P3-COMPONENTS-A.md`

## Exact Screen Checklist (189 Files)

Use this list as the canonical migration ledger for Phase 3.

### (modal)
- [x] `app/(modal)/add-child.tsx` - Wave: `W6` - Status: `DONE`
- [x] `app/(modal)/create-club-post.tsx` - Wave: `W6` - Status: `DONE`
- [x] `app/(modal)/create-post.tsx` - Wave: `W6` - Status: `DONE`
- [x] `app/(modal)/create-squad.tsx` - Wave: `W6` - Status: `DONE`
- [x] `app/(modal)/post-detail.tsx` - Wave: `W6` - Status: `DONE`

### (root)
- [x] `app/_layout.tsx` - Wave: `W6` - Status: `DONE`
- [x] `app/book-coach.tsx` - Wave: `W2` - Status: `DONE`
- [x] `app/coach-invites.tsx` - Wave: `W3` - Status: `DONE`
- [x] `app/confirm-booking.tsx` - Wave: `W2` - Status: `DONE`
- [x] `app/discover-sessions.tsx` - Wave: `W5` - Status: `DONE`
- [x] `app/earnings.tsx` - Wave: `W3` - Status: `DONE`
- [x] `app/invites.tsx` - Wave: `W3` - Status: `DONE`
- [x] `app/rate-coach.tsx` - Wave: `W5` - Status: `DONE`

### (tabs)
- [x] `app/(tabs)/_layout.tsx` - Wave: `W2` - Status: `DONE`
- [x] `app/(tabs)/admin/invite-codes.tsx` - Wave: `W2` - Status: `DONE`
- [x] `app/(tabs)/athletes.tsx` - Wave: `W2` - Status: `DONE`
- [x] `app/(tabs)/availability.tsx` - Wave: `W2` - Status: `DONE`
- [x] `app/(tabs)/badges.tsx` - Wave: `W2` - Status: `DONE`
- [x] `app/(tabs)/bookings/[id].tsx` - Wave: `W2` - Status: `DONE`
- [x] `app/(tabs)/bookings/_layout.tsx` - Wave: `W2` - Status: `DONE`
- [x] `app/(tabs)/bookings/index.tsx` - Wave: `W2` - Status: `DONE`
- [x] `app/(tabs)/bookings/objectives.tsx` - Wave: `W2` - Status: `DONE`
- [x] `app/(tabs)/bookings/report-problem.tsx` - Wave: `W2` - Status: `DONE`
- [x] `app/(tabs)/bookings/session-feedback.tsx` - Wave: `W2` - Status: `DONE`
- [x] `app/(tabs)/bookings/statistics.tsx` - Wave: `W2` - Status: `DONE`
- [x] `app/(tabs)/children.tsx` - Wave: `W2` - Status: `DONE`
- [x] `app/(tabs)/club-hub.tsx` - Wave: `W2` - Status: `DONE`
- [x] `app/(tabs)/coach-profile.tsx` - Wave: `W2` - Status: `DONE`
- [x] `app/(tabs)/earnings.tsx` - Wave: `W2` - Status: `DONE`
- [x] `app/(tabs)/edit-profile.tsx` - Wave: `W2` - Status: `DONE`
- [x] `app/(tabs)/feed.tsx` - Wave: `W2` - Status: `DONE`
- [x] `app/(tabs)/index.tsx` - Wave: `W2` - Status: `DONE`
- [x] `app/(tabs)/messages.tsx` - Wave: `W2` - Status: `DONE`
- [x] `app/(tabs)/more.tsx` - Wave: `W2` - Status: `DONE`
- [x] `app/(tabs)/notifications.tsx` - Wave: `W2` - Status: `DONE`
- [x] `app/(tabs)/profile.tsx` - Wave: `W2` - Status: `DONE`
- [x] `app/(tabs)/roster.tsx` - Wave: `W2` - Status: `DONE`
- [x] `app/(tabs)/schedule.tsx` - Wave: `W2` - Status: `DONE`
- [x] `app/(tabs)/settings.tsx` - Wave: `W2` - Status: `DONE`
- [x] `app/(tabs)/wallet.tsx` - Wave: `W2` - Status: `DONE`

### academy
- [x] `app/academy/[id].tsx` - Wave: `W4` - Status: `DONE`
- [x] `app/academy/[id]/branding.tsx` - Wave: `W4` - Status: `DONE`
- [x] `app/academy/[id]/settings.tsx` - Wave: `W4` - Status: `DONE`
- [x] `app/academy/[id]/staff.tsx` - Wave: `W4` - Status: `DONE`
- [x] `app/academy/create.tsx` - Wave: `W4` - Status: `DONE`
- [x] `app/academy/join.tsx` - Wave: `W4` - Status: `DONE`

### admin
- [x] `app/admin/promo-codes.tsx` - Wave: `W5` - Status: `DONE`
- [x] `app/admin/promo-codes/create.tsx` - Wave: `W5` - Status: `DONE`

### analytics
- [x] `app/analytics/[athleteId].tsx` - Wave: `W5` - Status: `DONE`
- [x] `app/analytics/_layout.tsx` - Wave: `W5` - Status: `DONE`
- [x] `app/analytics/dashboard.tsx` - Wave: `W5` - Status: `DONE`
- [x] `app/analytics/retention.tsx` - Wave: `W5` - Status: `DONE`
- [x] `app/analytics/revenue.tsx` - Wave: `W5` - Status: `DONE`

### athlete
- [x] `app/athlete/journal.tsx` - Wave: `W5` - Status: `DONE`

### availability
- [x] `app/availability/add-template.tsx` - Wave: `W4` - Status: `DONE`
- [x] `app/availability/block-date.tsx` - Wave: `W4` - Status: `DONE`
- [x] `app/availability/calendar.tsx` - Wave: `W4` - Status: `DONE`
- [x] `app/availability/edit-template.tsx` - Wave: `W4` - Status: `DONE`
- [x] `app/availability/scheduling-rules.tsx` - Wave: `W4` - Status: `DONE`

### badges
- [x] `app/badges/index.tsx` - Wave: `W5` - Status: `DONE`

### book
- [x] `app/book/[coachId]/_layout.tsx` - Wave: `W2` - Status: `DONE`
- [x] `app/book/[coachId]/confirmation.tsx` - Wave: `W2` - Status: `DONE`
- [x] `app/book/[coachId]/details.tsx` - Wave: `W2` - Status: `DONE`
- [x] `app/book/[coachId]/multi-week.tsx` - Wave: `W2` - Status: `DONE`
- [x] `app/book/[coachId]/review.tsx` - Wave: `W2` - Status: `DONE`
- [x] `app/book/[coachId]/schedule.tsx` - Wave: `W2` - Status: `DONE`
- [x] `app/book/[coachId]/session-type.tsx` - Wave: `W2` - Status: `DONE`

### booking
- [x] `app/booking/[id]/cancel.tsx` - Wave: `W2` - Status: `DONE`

### bookings
- [x] `app/bookings/[id]/counter.tsx` - Wave: `W2` - Status: `DONE`
- [x] `app/bookings/[id]/negotiate.tsx` - Wave: `W2` - Status: `DONE`
- [x] `app/bookings/recurring.tsx` - Wave: `W2` - Status: `DONE`
- [x] `app/bookings/subscribe.tsx` - Wave: `W2` - Status: `DONE`

### carpool
- [x] `app/carpool/index.tsx` - Wave: `W4` - Status: `DONE`

### chat
- [x] `app/chat/[threadId].tsx` - Wave: `W2` - Status: `DONE`

### child
- [x] `app/child/[id]/emergency.tsx` - Wave: `W5` - Status: `DONE`
- [x] `app/child/[id]/medical.tsx` - Wave: `W5` - Status: `DONE`

### children
- [x] `app/children/badges/[childId].tsx` - Wave: `W3` - Status: `DONE`

### club
- [x] `app/club/[clubId]/_layout.tsx` - Wave: `W4` - Status: `DONE`
- [x] `app/club/[clubId]/branding.tsx` - Wave: `W4` - Status: `DONE`
- [x] `app/club/[clubId]/calendar.tsx` - Wave: `W4` - Status: `DONE`
- [x] `app/club/[clubId]/dashboard.tsx` - Wave: `W4` - Status: `DONE`
- [x] `app/club/[clubId]/member/[memberId].tsx` - Wave: `W4` - Status: `DONE`
- [x] `app/club/[id].tsx` - Wave: `W4` - Status: `DONE`
- [x] `app/club/create.tsx` - Wave: `W4` - Status: `DONE`
- [x] `app/club/invite-members.tsx` - Wave: `W4` - Status: `DONE`
- [x] `app/club/settings.tsx` - Wave: `W4` - Status: `DONE`
- [x] `app/club/squad/[id].tsx` - Wave: `W4` - Status: `DONE`
- [x] `app/club/squad/create.tsx` - Wave: `W4` - Status: `DONE`
- [x] `app/club/training-schedule.tsx` - Wave: `W4` - Status: `DONE`

### coach
- [x] `app/coach/[coachId]/public.tsx` - Wave: `W6` - Status: `DONE`
- [x] `app/coach/[id].tsx` - Wave: `W6` - Status: `DONE`

### community
- [x] `app/community/[groupId].tsx` - Wave: `W4` - Status: `DONE`
- [x] `app/community/index.tsx` - Wave: `W4` - Status: `DONE`

### compare
- [x] `app/compare/[ids].tsx` - Wave: `W5` - Status: `DONE`
- [x] `app/compare/index.tsx` - Wave: `W5` - Status: `DONE`

### development
- [x] `app/development/athlete-session/[sessionId].tsx` - Wave: `W5` - Status: `DONE`
- [x] `app/development/athlete/[athleteId].tsx` - Wave: `W5` - Status: `DONE`
- [x] `app/development/athlete/[athleteId]/special-needs.tsx` - Wave: `W5` - Status: `DONE`
- [x] `app/development/badges.tsx` - Wave: `W5` - Status: `DONE`
- [x] `app/development/child-progress/[childId].tsx` - Wave: `W5` - Status: `DONE`
- [x] `app/development/my-progress.tsx` - Wave: `W5` - Status: `DONE`
- [x] `app/development/session/[sessionId].tsx` - Wave: `W5` - Status: `DONE`

### discover
- [x] `app/discover/filters.tsx` - Wave: `W5` - Status: `DONE`
- [x] `app/discover/map.tsx` - Wave: `W5` - Status: `DONE`

### drills
- [x] `app/drills/[id].tsx` - Wave: `W6` - Status: `DONE`
- [x] `app/drills/assign.tsx` - Wave: `W6` - Status: `DONE`
- [x] `app/drills/challenges.tsx` - Wave: `W6` - Status: `DONE`
- [x] `app/drills/create-challenge.tsx` - Wave: `W6` - Status: `DONE`
- [x] `app/drills/create.tsx` - Wave: `W6` - Status: `DONE`
- [x] `app/drills/index.tsx` - Wave: `W6` - Status: `DONE`
- [x] `app/drills/library.tsx` - Wave: `W6` - Status: `DONE`

### events
- [x] `app/events/[id].tsx` - Wave: `W4` - Status: `DONE`
- [x] `app/events/[id]/attendees.tsx` - Wave: `W4` - Status: `DONE`
- [x] `app/events/[id]/rsvp.tsx` - Wave: `W4` - Status: `DONE`
- [x] `app/events/create.tsx` - Wave: `W4` - Status: `DONE`
- [x] `app/events/index.tsx` - Wave: `W4` - Status: `DONE`

### family
- [x] `app/family/calendar.tsx` - Wave: `W3` - Status: `DONE`
- [x] `app/family/index.tsx` - Wave: `W3` - Status: `DONE`
- [x] `app/family/sharing.tsx` - Wave: `W3` - Status: `DONE`
- [x] `app/family/spending.tsx` - Wave: `W3` - Status: `DONE`

### favourites
- [x] `app/favourites/index.tsx` - Wave: `W5` - Status: `DONE`

### goals
- [x] `app/goals/[id].tsx` - Wave: `W5` - Status: `DONE`
- [x] `app/goals/create.tsx` - Wave: `W5` - Status: `DONE`
- [x] `app/goals/index.tsx` - Wave: `W5` - Status: `DONE`

### group-sessions
- [x] `app/group-sessions/[id].tsx` - Wave: `W4` - Status: `DONE`
- [x] `app/group-sessions/[id]/roster.tsx` - Wave: `W4` - Status: `DONE`
- [x] `app/group-sessions/create.tsx` - Wave: `W4` - Status: `DONE`
- [x] `app/group-sessions/index.tsx` - Wave: `W4` - Status: `DONE`

### health
- [x] `app/health/[id].tsx` - Wave: `W5` - Status: `DONE`
- [x] `app/health/index.tsx` - Wave: `W5` - Status: `DONE`
- [x] `app/health/injuries.tsx` - Wave: `W5` - Status: `DONE`
- [x] `app/health/log.tsx` - Wave: `W5` - Status: `DONE`

### invoices
- [x] `app/invoices/[id].tsx` - Wave: `W3` - Status: `DONE`
- [x] `app/invoices/index.tsx` - Wave: `W3` - Status: `DONE`

### matches
- [x] `app/matches/[id].tsx` - Wave: `W4` - Status: `DONE`
- [x] `app/matches/create.tsx` - Wave: `W4` - Status: `DONE`
- [x] `app/matches/index.tsx` - Wave: `W4` - Status: `DONE`

### packages
- [x] `app/packages/[id].tsx` - Wave: `W6` - Status: `DONE`
- [x] `app/packages/index.tsx` - Wave: `W6` - Status: `DONE`
- [x] `app/packages/manage.tsx` - Wave: `W6` - Status: `DONE`

### payment
- [x] `app/payment/add-card.tsx` - Wave: `W3` - Status: `DONE`
- [x] `app/payment/methods.tsx` - Wave: `W3` - Status: `DONE`

### referrals
- [x] `app/referrals/index.tsx` - Wave: `W3` - Status: `DONE`
- [x] `app/referrals/invite.tsx` - Wave: `W3` - Status: `DONE`

### review
- [x] `app/review/[bookingId].tsx` - Wave: `W4` - Status: `DONE`

### roster
- [x] `app/roster/[athleteId]/add-to-session.tsx` - Wave: `W3` - Status: `DONE`
- [x] `app/roster/[athleteId]/emergency.tsx` - Wave: `W3` - Status: `DONE`
- [x] `app/roster/[athleteId]/index.tsx` - Wave: `W3` - Status: `DONE`
- [x] `app/roster/[athleteId]/raise-concern.tsx` - Wave: `W3` - Status: `DONE`
- [x] `app/roster/consents.tsx` - Wave: `W3` - Status: `DONE`
- [x] `app/roster/index.tsx` - Wave: `W3` - Status: `DONE`

### session
- [x] `app/session/[id]/complete.tsx` - Wave: `W2` - Status: `DONE`
- [x] `app/session/[id]/rsvp.tsx` - Wave: `W2` - Status: `DONE`

### session-invites
- [x] `app/session-invites/[id].tsx` - Wave: `W2` - Status: `DONE`
- [x] `app/session-invites/create.tsx` - Wave: `W2` - Status: `DONE`
- [x] `app/session-invites/group.tsx` - Wave: `W2` - Status: `DONE`
- [x] `app/session-invites/index.tsx` - Wave: `W2` - Status: `DONE`
- [x] `app/session-invites/squad.tsx` - Wave: `W2` - Status: `DONE`

### session-notes
- [x] `app/session-notes/[bookingId].tsx` - Wave: `W5` - Status: `DONE`

### sessions
- [x] `app/sessions/create.tsx` - Wave: `W5` - Status: `DONE`

### settings
- [x] `app/settings/_layout.tsx` - Wave: `W6` - Status: `DONE`
- [x] `app/settings/account.tsx` - Wave: `W6` - Status: `DONE`
- [x] `app/settings/appearance.tsx` - Wave: `W6` - Status: `DONE`
- [x] `app/settings/calendar-sync.tsx` - Wave: `W6` - Status: `DONE`
- [x] `app/settings/coaching.tsx` - Wave: `W6` - Status: `DONE`
- [x] `app/settings/help.tsx` - Wave: `W6` - Status: `DONE`
- [x] `app/settings/index.tsx` - Wave: `W6` - Status: `DONE`
- [x] `app/settings/notifications/_layout.tsx` - Wave: `W6` - Status: `DONE`
- [x] `app/settings/notifications/index.tsx` - Wave: `W6` - Status: `DONE`
- [x] `app/settings/notifications/preferences.tsx` - Wave: `W6` - Status: `DONE`
- [x] `app/settings/privacy-policy.tsx` - Wave: `W6` - Status: `DONE`
- [x] `app/settings/privacy.tsx` - Wave: `W6` - Status: `DONE`
- [x] `app/settings/terms.tsx` - Wave: `W6` - Status: `DONE`

### skills
- [x] `app/skills/[category].tsx` - Wave: `W5` - Status: `DONE`
- [x] `app/skills/_layout.tsx` - Wave: `W5` - Status: `DONE`
- [x] `app/skills/index.tsx` - Wave: `W5` - Status: `DONE`

### squads
- [x] `app/squads/[id]/invite.tsx` - Wave: `W4` - Status: `DONE`

### verification
- [x] `app/verification/background.tsx` - Wave: `W4` - Status: `DONE`
- [x] `app/verification/credentials.tsx` - Wave: `W4` - Status: `DONE`
- [x] `app/verification/id.tsx` - Wave: `W4` - Status: `DONE`
- [x] `app/verification/index.tsx` - Wave: `W4` - Status: `DONE`

### videos
- [x] `app/videos/[id].tsx` - Wave: `W5` - Status: `DONE`
- [x] `app/videos/annotate/[id].tsx` - Wave: `W5` - Status: `DONE`
- [x] `app/videos/index.tsx` - Wave: `W5` - Status: `DONE`
- [x] `app/videos/review/[id].tsx` - Wave: `W5` - Status: `DONE`
- [x] `app/videos/upload.tsx` - Wave: `W5` - Status: `DONE`

### waitlist
- [x] `app/waitlist/index.tsx` - Wave: `W2` - Status: `DONE`
- [x] `app/waitlist/manage.tsx` - Wave: `W2` - Status: `DONE`

### wallet
- [x] `app/wallet/promo.tsx` - Wave: `W3` - Status: `DONE`

## Totals

- Checklist items: **189**
- Done: **189**
- In progress: **0**
- Blocked: **0**
- Not started: **0**

## Phase 3 Quality Gates

Phase 3 is complete when all are true:

- [x] `useScreen()` supports `refetchOnFocus`.
- [x] `combineResults()` exists in `types/result.ts` and is used where multi-source loads are needed.
- [x] All app screens use the 4-state pattern (`loading/error/empty/success`).
- [x] Scrollable screens wire pull-to-refresh to `onRefresh`.
- [x] `ActivityIndicator` usage in app screens is retired for primary load states.
- [x] `NODE_OPTIONS=--max-old-space-size=8192 npx tsc -p tsconfig.typecheck.json --pretty false`
- [x] `NODE_OPTIONS=--max-old-space-size=8192 npx tsc -p tsconfig.test.json --pretty false`
