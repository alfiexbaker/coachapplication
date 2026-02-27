# Booking & Sessions Unified Sprint (Sprints 3 + 4)

**Date**: 2026-02-27  
**Status**: Execution-ready  
**Spines**: Booking/Revenue + Trust/Ops + Community (club delegation)

## Why this sprint exists
- Booking creation and invite entry points are duplicated across routes.
- Small-screen modals still produce dead-ends (Save/Confirm unreachable).
- Club owners/admins/head coaches cannot run end-to-end delegated booking operations from one place.
- Role access behavior is fragile when tab visibility and permissions diverge.

This file replaces parallel planning and is the canonical Sprint 3+4 execution backlog.

## Playwright Baseline (fresh run)
- Command: `npm run ui:flows:run -- --fail-on=none` (coach/parent/athlete)
- Merge: `npm run ui:flows:merge -- --input-dir=/tmp/ui-flow-checks-50 --output-dir=/tmp/ui-flow-checks-50-merged-fresh --fail-on=none`
- Result: `69/69` flows pass, `0` failed, `4` medium console findings.
- Evidence: `/tmp/ui-flow-checks-50-merged-fresh/report.merged.md`

## Target interaction spine (single flow model)
1. Intent: `new`, `existing`, `invite`, `book-coach`
2. Session mode: `direct`, `small-group`, `group`, `camp`
3. Schedule: once / recurring / multi-week under one recurrence model
4. Ownership: self vs club + assignee coach
5. Review: pricing, cancellation, recurrence, ownership summary
6. Commit: one booking write contract + deterministic success route

## Consolidated workstreams

### WS1: Interaction spine consolidation (from Sprint 3)

#### Item 301: Canonical intent router + alias cleanup
**Files**
- `navigation/routes.ts`
- `app/sessions/create.tsx`
- `app/group-sessions/create.tsx`
- `app/session-invites/create.tsx`
- `app/session-invites/group.tsx`
- `app/coach/invite.tsx`
- `app/roster/[athleteId]/add-to-session.tsx`

**Acceptance**
- [ ] All create/invite aliases call one typed helper (`Routes.sessionsCreateIntent`).
- [ ] `sessions/create` normalizes params once.
- [ ] No duplicate branch logic for equivalent intents.
- [ ] Legacy deep links still resolve into canonical behavior.

#### Item 302: Direct vs Group differentiation with early recurrence constraints
**Files**
- `hooks/use-create-session.ts`
- `components/session/create-details-step.tsx`
- `components/session/create-schedule-step.tsx`
- `components/session/create-review-step.tsx`

**Acceptance**
- [ ] Direct/group/small-group/camp have distinct copy and constraints.
- [ ] Unsupported recurrence+invite combinations are blocked before submit.
- [ ] Review step shows final recurrence + invite policy explicitly.

#### Item 303: Reuse one map-based location picker everywhere
**Files**
- `components/availability/day-editor-venue-section.tsx`
- `components/session/create-schedule-step.tsx`
- `components/invite/*`
- `utils/location-presets.ts`

**Acceptance**
- [ ] Day editor, create session, and invite setup use one picker component.
- [ ] New locations persist to `STORAGE_KEYS.SAVED_LOCATIONS`.
- [ ] No duplicate location modal implementations.

#### Item 304: Small-screen modal reachability contract
**Files**
- `components/coach/day-editor-sheet.tsx`
- `components/earnings/coach-payment-instructions-card.tsx`
- booking-related modal/sheet forms

**Acceptance**
- [ ] Save/Confirm actions are always reachable on iPhone SE viewport.
- [ ] Modal body scrolls independently from fixed action footer.
- [ ] Keyboard and tap behavior are stable.

#### Item 305: Explicit role-route access matrix for booking surfaces
**Files**
- `app/(tabs)/_layout.tsx`
- new route policy constants (`constants/route-access.ts` or equivalent)
- `scripts/ui-flow-checks-50.mjs`

**Acceptance**
- [ ] Access policy is data-driven and separate from tab visibility.
- [ ] Coach-accessible hidden routes stay accessible.
- [ ] Redirects are deterministic and no unauthorized flash is shown.

### WS2: Club delegation + employer operations (from Sprint 4)

#### Item 401: Club Booking Console (single employer entry)
**Files**
- `app/manage/index.tsx`
- `app/manage/bookings.tsx` (new)
- `hooks/use-manage-bookings.ts` (new)

**Acceptance**
- [ ] Owner/admin/head coach can create, assign, monitor from one console.
- [ ] Acting-as (`self` vs `club`) and assignee are explicit before publish.
- [ ] Existing manage shortcuts route into the same console flow.

#### Item 402: Ownership + assignment data contract
**Files**
- `constants/types.ts`
- `constants/session-types.ts`
- `services/booking/booking-crud-service.ts`
- `services/multi-week-booking-service.ts`
- `services/recurring-booking-service.ts`

**Acceptance**
- [ ] Booking/session records consistently store `actingAs`, creator, owner, club, assignee.
- [ ] All creation paths populate ownership metadata.
- [ ] Recurring and multi-week children preserve ownership lineage.

#### Item 403: Assign-to-coach inside canonical create flow
**Files**
- `app/sessions/create.tsx`
- `hooks/use-create-session.ts`
- `components/session/create-details-step.tsx`
- `services/academy-service.ts`

**Acceptance**
- [ ] Club-capable roles can assign sessions to coaches in-flow.
- [ ] Assignment is required for club-owned publishes.
- [ ] Confirmation shows actor + club + assignee summary.

#### Item 404: Recurring programs for club-owned sessions
**Files**
- `hooks/use-create-session.ts`
- `services/recurring-booking-service.ts`
- `services/multi-week-booking-service.ts`
- `services/invite/session-invite-service.ts`

**Acceptance**
- [ ] Club-owned recurring creation and management run end-to-end.
- [ ] Invite-accepted recurring sessions align to one series model.
- [ ] Unsupported combos are blocked with immediate alternatives.

#### Item 405: Club master operations board (day + risk + accountability)
**Files**
- `app/club/[clubId]/dashboard.tsx`
- `app/club/[clubId]/calendar.tsx`
- `hooks/use-club-dashboard.ts`
- `hooks/use-club-calendar.ts`
- `app/(tabs)/bookings/index.tsx`

**Acceptance**
- [ ] Club masters can see assigned/unassigned/risk queues in one place.
- [ ] Club-created sessions show in both club calendar and assignee schedule.
- [ ] Lists are filterable by coach, squad, and ownership type.

## 5 additional issues to execute now

### Item 406: Booking confirmation "View booking" routes to cancel flow
**Evidence**
- `app/book/[coachId]/confirmation.tsx:37-40` uses `router.replace(Routes.bookingCancel(id))`.

**Impact**
- User taps "View booking" and lands in cancellation route, not booking detail.

**Acceptance**
- [ ] "View booking" opens `Routes.booking(id)` detail, not cancel.
- [ ] Booking wizard success state remains intact after redirect.

### Item 407: Day editor exposes `next-n-weeks` scope type but never renders/saves it
**Evidence**
- Scope type includes `next-n-weeks`: `components/coach/day-editor-sheet.tsx:22`.
- Prop exists but is never passed to hook: `components/coach/day-editor-sheet.tsx:46-52`, `:75-88`.
- Save handler only handles recurring + just-this-date: `hooks/use-day-editor.ts:221-230`.

**Impact**
- Repeated overrides are declared in API but impossible in UI.

**Acceptance**
- [ ] `next-n-weeks` can be selected in UI.
- [ ] Save path calls repeated override handler with repeat count.
- [ ] Summary label reflects selected repeated override behavior.

### Item 408: Payment instructions modal still violates fixed-action-footer contract
**Evidence**
- Save/Cancel row lives inside scroll content: `components/earnings/coach-payment-instructions-card.tsx:451-469`.

**Impact**
- On small screens/keyboard states, Save can become hard to reach.

**Acceptance**
- [ ] Save/Cancel moves to fixed footer rail with safe-area padding.
- [ ] Form body remains scrollable and keyboard-safe.
- [ ] iPhone SE viewport can always reach Save in one interaction path.

### Item 409: Tab visibility and route permission are still coupled via exception list
**Evidence**
- Access derived from hidden route set minus allow-list: `app/(tabs)/_layout.tsx:84-97`, `:240-243`.
- Coach config hides bookings + club-hub by default: `app/(tabs)/_layout.tsx:108`.

**Impact**
- Easy to regress into false "Access restricted" blocks (Coach1 complaint).

**Acceptance**
- [ ] Introduce explicit permission matrix independent from tab visibility.
- [ ] Add route-level tests for coach/parent/athlete booking surfaces.
- [ ] Remove hidden-route exception coupling.

### Item 410: Create Club crashes from invalid unsaved-changes hook import
**Evidence**
- Playwright finding: `/club/create` runtime `TypeError: usePreventRemove is not a function`.
- Hook imports from `expo-router`: `hooks/use-unsaved-changes-warning.ts:2`.

**Impact**
- Club creation flow is unstable and can hard-crash in web runs.

**Acceptance**
- [ ] Unsaved-changes guard uses supported navigation API on all platforms.
- [ ] `/club/create` is clean in Playwright console.
- [ ] No regression in invite/create flows using same hook.

## Validation plan (mandatory)
- UI flows:
  - `npm run ui:flows:run -- --fail-on=none`
  - `npm run ui:flows:merge -- --input-dir=/tmp/ui-flow-checks-50 --output-dir=/tmp/ui-flow-checks-50-merged --fail-on=none`
- Add focused flow checks for:
  - coach booking access from hidden tab routes
  - day-editor and payment-instructions modal reachability (iPhone SE)
  - booking confirmation destination correctness
  - club create flow crash regression
- Service tests:
  - ownership metadata propagation across direct/invite/recurring/multi-week creation paths

## Definition of done
- [ ] All items 301-305 complete.
- [ ] All items 401-405 complete.
- [ ] All items 406-410 complete.
- [ ] Playwright merged report shows `failed=0`, `high=0`, `medium=0` for booking/club surfaces.
- [ ] No duplicate booking/create flows remain in route map.
