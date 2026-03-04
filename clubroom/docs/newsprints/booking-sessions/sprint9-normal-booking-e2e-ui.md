# Booking & Sessions Sprint 9 Addendum: Normal Booking E2E UI (All Entry Paths)

**Date**: 2026-03-04  
**Status**: Implemented report addendum (execution guide)  
**Scope**: Normal booking journeys (parent/athlete) and club-context visibility in booking flow

This addendum goes deeper than sprint strategy and describes how the UI behaves today, flow-by-flow.

## 1) Canonical normal-booking stack (shared baseline)

When a flow enters `/book/[coachId]`, this is the shared screen stack:

1. `Session Type` (`/book/[coachId]/session-type`, step 1)
2. `Schedule` (`/book/[coachId]/schedule`, step 2)
3. `Details` (`/book/[coachId]/details`, step 3)
4. `Review` (`/book/[coachId]/review`, step 4)
5. `Confirmation` (`/book/[coachId]/confirmation`, step 5)

Resolver behavior lives at `/book/[coachId]/index.tsx` and decides whether to:
- fast-track using known offering/context
- or fall back to step 1

Key current behavior:
- Discover-like sources and/or `offeringId` can skip manual type selection.
- Fixed offering date/time can jump directly to details/review.
- If context missing, it falls back to session-type.

---

## 2) Flow A: Find on Map (Map -> Book)

## Entry points
- `app/discover/map.tsx` -> `onBookCoach` -> `Routes.bookCoach(coachId, { source: 'discover_map' })`
- Map sheet `Book session` CTA is rendered in `components/discover/map-content.native.tsx`.

## UI today

## A1. Map surface
- Full map with price pins.
- Bottom sheet coach cards: avatar, name, rating, distance, skill chips, price.
- CTA text: `Book session`.

## A2. On tap `Book session`
- Router opens `/book/[coachId]` with source=`discover_map`.
- Resolver attempts to fast-track:
  - If a valid offering can be resolved, prefill draft and skip unnecessary choices.
  - If not, opens step 1 (`Book a session`).

## A3. Booking wizard visuals
- Step 1: offering cards (title, price, duration, location, age, capacity).
- Step 2: calendar + time-slot grid.
- Step 3: location/details + child selector.
- Step 4: summary + payment/review cards.
- Step 5: confirmation + `View booking`.

## UI friction currently seen
- Map path often lacks explicit `offeringId`, so some users still land on step 1 when they expected deeper prefill.
- Club context visibility is weak in review step (if session is club-owned).

## Required build behavior
- If source is map + one clear upcoming offering exists, skip step 1 by default.
- Show source-context chip on first reached step (e.g., `From map`).
- Preserve back behavior to map/discover context where possible.

---

## 3) Flow B: Invited (Invite-first booking)

## Entry points
- Discover surfaces show `PendingInvitesSection` (`Action Required`).
- Invite detail route: `app/session-invites/[id].tsx`.

## UI today

## B1. Invite card (compact)
- Message banner (`Coach X invited Y...`).
- Session/date snippet.
- Status badge.
- Tap opens full invite detail.

## B2. Invite detail screen
- Header/banner, coach/club context, session meta.
- Proposed slot selector (single or multiple slots).
- Actions: `Accept`, `Decline`, `Counter`.
- Optional RSVP controls.
- Payment modal shown before accept if invite price > 0.

## B3. Accept path
- On accept, service creates booking first (`bookingService.createBooking`) and only then mutates invite status.
- Success route:
  - booking detail if `bookingId` created
  - group session fallback if linked

## UI friction currently seen
- Heavy use of native alerts on decline/counter/error in invite detail.
- Invite acceptance does not use the booking wizard stack; it is action-first.

## Required build behavior
- Keep action-first invite acceptance (good for speed), but replace system alerts with in-app feedback components.
- Add short post-accept confirmation sheet before redirect to booking detail.
- Ensure invite cards and invite list stay state-synced instantly after response.

---

## 4) Flow C: OfferedByClub (club-owned offering booked by parent/athlete)

## Entry points
- Discover cards and booking lists can include offerings where `actingAs='club'`.
- `SessionOfferingCard` displays ownership badges (`Club-owned`, `Assigned by Club`) when applicable.

## UI today

## C1. Listing card
- Standard offering card UI (title/schedule/location/capacity/price).
- Ownership badge visible in some contexts.

## C2. Booking flow prefill
- Draft includes lineage from offering:
  - `actingAs`, `clubId`, `ownerCoachId`, `assigneeCoachId`, `createdBy*`
- Location is preset to coach/venue from offering.

## C3. Details step behavior
- If fast-tracked and preset venue exists, location picker can be locked to avoid noisy location editing.

## C4. Review step
- Shows coach/date/time/location/athlete/price.
- **Gap**: does not consistently expose club ownership context (`on behalf of club`, assignee label) in review summary.

## Required build behavior
- Always show ownership context in review + confirmation when `actingAs='club'`.
- Keep the booking interaction identical to normal flow; only metadata/labels differ.
- Ensure parent always understands who delivers session and under which club context.

---

## 5) Flow D: Discover (Feed + Discover Sessions)

## Entry points
- `Bookings > Discover` feed sections:
  - Action Required (invites)
  - This Week
  - Your Coaches
  - Club Training
  - Open Sessions
- Standalone `Discover Sessions` screen with search/type/skill filters.

## UI today

## D1. Discover feed card interactions
- Offering cards: route to `/book/[coachId]` with `offeringId`, source, optional child.
- Coach cards: route to `/book/[coachId]` with source and optionally preferred offering.
- Group-session cards: route to group session detail (not direct booking wizard).

## D2. Discover sessions list
- Top: pending invites section.
- Search bar + horizontal filters.
- Session offering cards with coach/location/time/price.

## D3. Booking start outcome
- If offering context is present/valid: prefilled draft and step skip where possible.
- If coach-only context: may show step 1 offering choice.

## UI friction currently seen
- Different discover entry tiles still produce inconsistent perceived depth (some fast-track, some start at step 1).

## Required build behavior
- Enforce deterministic rule:
  - Offering-tap = prefill and skip type selection.
  - Coach-tap = choose nearest eligible offering automatically, then skip when safe.
- Add subtle in-flow context label (`From discover`) to reduce perceived reset.

---

## 6) Flow E: Recurring

Recurring has two practical patterns today.

## E1. Recurring offering booked as multi-week from session detail

### Entry
- Session detail modal passes `weeks` and `source='session_detail_modal'`.
- Resolver sends to `/book/[coachId]/multi-week` when recurring + `weeks > 1`.

### UI
- `Book Multiple Weeks` header.
- Week-row picker with availability and running total.
- Confirmation card listing selected weeks, total cost, and `Confirm` CTA.

### Submit
- Uses multi-week series service path, then alert-based success currently.

### Current friction
- Uses `Alert` for success/failure instead of in-app flow feedback.
- Default placeholders (`Coach`, `1:1 Session`) are visible in hook defaults and should be replaced by offering-driven values.

## E2. Recurring offering as normal single booking

### Entry
- Discover/session routes with recurring offering but no `weeks > 1`.

### UI
- Goes through standard booking stack with recurring schedule prefill where available.

### Current friction
- If recurring schedule cannot be resolved, user can be pushed back to schedule selection unexpectedly.

## Required build behavior
- Unify recurring summary language with standard review styling.
- Replace alert feedback with in-app confirmation component.
- Ensure recurring context is explicit in review (`Recurring weekly`, next n dates).

---

## 7) UI state table (current behavior)

| Flow | First UI surface | Fast-track potential | Main CTA model | Feedback model now |
|---|---|---|---|---|
| Find on map | Map + bottom sheet coach card | Medium (depends on offering resolution) | `Book session` | Mixed (wizard + alerts) |
| Invited | Invite card / invite detail | High (action-first) | `Accept/Decline/Counter` | Mostly alerts |
| OfferedByClub | Discover/listing offering card | High (offering-id prefill) | Standard wizard CTA | Wizard + limited ownership labels |
| Discover | Feed/session cards | High on offering taps, mixed on coach taps | `Continue` in wizard | Wizard + in-app components |
| Recurring | Multi-week picker or wizard | High when weeks passed | `Review weeks` -> `Confirm` | Alerts in multi-week path |

---

## 8) E2E edge cases by flow

## Map
- Coach has no eligible active offering.
- Coach has multiple offerings with same signature/time.
- User re-enters flow with stale draft from previous coach.

## Invited
- Slot taken at accept time.
- Invite expired while detail screen open.
- Counter accepted but booking creation fails.

## OfferedByClub
- Assignee changed after offering published.
- Parent sees club-owned offering but review hides club context.
- Ownership fields missing on projected offering.

## Discover
- Child filter active but coach/offering mismatched by age restrictions.
- Coach-card tap without offeringId repeatedly falls back to type step.

## Recurring
- Biweekly recurrence alignment edge (off-week).
- Cancelled recurring instances appear selectable.
- Weeks selected include unavailable instance between refresh and confirm.

---

## 9) UX implementation directives (build-ready)

## D1. Keep one booking visual language
- Use the same header, progress model, CTA placement, and summary card style across all normal booking paths.

## D2. Source-aware but not source-fragmented
- Show source chip (`Map`, `Discover`, `Invite`, `Club`, `Recurring`) at top.
- Never create separate full-screen flows for each source.

## D3. Ownership clarity for club offerings
- Add ownership row on review + confirmation:
  - `Booked via <Club Name>`
  - `Delivered by <Assignee Coach>`

## D4. In-app feedback only for routine outcomes
- Replace alert calls in booking-related actions with shared in-app feedback component.

## D5. Deterministic prefill policy
- Offering selected -> skip type step.
- Known schedule slot -> skip schedule step.
- Known child target -> skip selector.
- Missing critical field -> go to earliest required step.

---

## 10) Metrics and sub-metrics by these five flows

## Map
- map_card_book_tap_rate
- map_flow_step1_fallback_rate
- map_to_booking_create_conversion

## Invited
- invite_open_rate
- invite_accept_success_rate
- invite_accept_booking_failure_rate
- invite_counter_resolution_time

## OfferedByClub
- club_offering_visibility_rate
- club_offering_booking_conversion
- club_lineage_completeness_rate
- club_ownership_label_render_rate

## Discover
- discover_offering_tap_to_review_rate
- discover_coach_tap_to_review_rate
- discover_prefill_skip_depth

## Recurring
- recurring_multiweek_start_rate
- recurring_multiweek_confirm_rate
- recurring_series_creation_success_rate
- recurring_instance_conflict_rate

---

## 11) Devil's-Advocate Gap Review (deeper pass)

This section challenges assumptions from the first draft and calls out remaining risks by severity.

## P0 (must fix)

1. Multi-week booking context drift (now patched in code)
- Risk:
  - Multi-week flow previously used hardcoded `Coach`, `1:1 Session`, `£60`, and booked against `currentUser.id` instead of selected child context.
- Impact:
  - Wrong athlete lineage, incorrect price/duration, trust-breaking confirmation text.
- Evidence:
  - `hooks/use-multi-week.ts` (hardcoded values and athlete mapping before patch).
- Patch applied:
  - Multi-week now reads booking draft context (coach/session/price/duration/child/source lineage), seeds selection from requested weeks, and uses in-app alerts.

2. Discover is still orchestrated by multiple independent controllers
- Risk:
  - We still run discovery through:
    - `hooks/use-discover-sessions.ts`
    - `hooks/use-bookings-discover.ts`
    - `components/parent/discover-screen.tsx` (home tab legacy path)
- Impact:
  - Inconsistent filtering, invite handling, and discover->booking expectations across surfaces.
- Evidence:
  - `app/discover-sessions.tsx`, `components/bookings/discover-feed.tsx`, `app/(tabs)/index.tsx`.

## P1 (high)

1. Booking step asks for data we already know in some offering paths
- Risk:
  - Schedule step fetches generic coach availability and is not strictly scoped to selected offering identity.
- Impact:
  - Users can feel "reset" into date/time picking despite selecting a concrete discover card.
- Evidence:
  - `app/book/[coachId]/schedule.tsx` (coach availability only; no offering-specific schedule constraint).

2. Fast-track resolver can still feel inconsistent between discover entry points
- Risk:
  - Resolver uses route-source heuristics and can behave differently for offering taps vs coach taps.
- Impact:
  - Some entries feel over-skipped while others feel re-collected.
- Evidence:
  - `app/book/[coachId]/index.tsx`.

3. Invite detail/list still rely heavily on system alerts
- Risk:
  - Critical accept/decline/counter/reminder paths still use `Alert.alert`.
- Impact:
  - UX inconsistency versus in-app modal/feedback model.
- Evidence:
  - `app/session-invites/[id].tsx`
  - `app/session-invites/index.tsx`
  - `app/sessions/create.tsx` (existing invite flow branch)

4. "Coach Review Pending" can persist with no visible SLA
- Risk:
  - Parent-facing label maps from `AWAITING_COMPLETION` and can remain indefinitely when coach has not completed session workflow.
- Impact:
  - Parent sees stale pending state and loses confidence in session lifecycle.
- Evidence:
  - `utils/booking-display.ts`
  - `hooks/use-bookings.ts` status mapping
  - `services/booking/booking-status-service.ts` (no automatic aging transition beyond awaiting-completion)

## P2 (medium)

1. Club ownership context still under-emphasized in booking review/confirmation
- Risk:
  - Offering lineage fields are carried, but review/confirmation copy does not consistently explain "booked via club, delivered by X".
- Impact:
  - Parent clarity drops for club-admin-created sessions.
- Evidence:
  - `app/book/[coachId]/review.tsx`
  - `app/book/[coachId]/confirmation.tsx`

2. Map/search coach-book actions without explicit offering context remain broad
- Risk:
  - Coach-level entry can start booking without first pinning an exact session identity.
- Impact:
  - More perceived flow variance and lower prefill predictability.
- Evidence:
  - `app/discover/map.tsx`
  - `app/book-coach.tsx`

---

## 12) File anchors used

- `/app/discover/map.tsx`
- `/components/discover/map-content.native.tsx`
- `/hooks/use-bookings-discover.ts`
- `/hooks/use-discover-sessions.ts`
- `/app/discover-sessions.tsx`
- `/components/bookings/pending-invites-section.tsx`
- `/components/parent/session-invite-card.tsx`
- `/app/session-invites/[id].tsx`
- `/app/book/[coachId]/index.tsx`
- `/app/book/[coachId]/session-type.tsx`
- `/app/book/[coachId]/schedule.tsx`
- `/app/book/[coachId]/details.tsx`
- `/app/book/[coachId]/review.tsx`
- `/app/book/[coachId]/confirmation.tsx`
- `/app/book/[coachId]/multi-week.tsx`
- `/hooks/use-multi-week.ts`
- `/components/sessions/session-offering-card.tsx`
- `/app/session-invites/index.tsx`
- `/app/(tabs)/bookings/index.tsx`
- `/app/(tabs)/index.tsx`
- `/components/bookings/discover-feed.tsx`
- `/hooks/use-session-detail-modal.ts`
- `/app/sessions/create.tsx`
- `/hooks/use-create-session.ts`
- `/utils/booking-display.ts`

---

## 13) Deep Follow-up (this pass)

## What was patched now

1. State-aware continue in booking step 1
- File: `/app/book/[coachId]/session-type.tsx`
- Change:
  - `Continue` no longer always forces schedule step.
  - It now routes by known state:
    - recurring + multi-week request -> multi-week flow
    - missing date/slot -> schedule
    - missing athlete -> details
    - otherwise -> review
- Result:
  - Discover/map/session-modal entries with known context stop feeling reset.

2. Quick action tile sizing reduced slightly
- File: `/components/user/home-screen-sections.tsx`
- Change:
  - `Find Coach` / `My Progress` tiles reduced a little (not small) for compactness on small devices.

3. Booking/invite review paths moved from native alerts to in-app alerts
- Files:
  - `/app/session-invites/[id].tsx`
  - `/app/session-invites/index.tsx`
  - `/components/sessions/session-offering-card.tsx`
  - `/app/review/[bookingId].tsx`
  - `/hooks/use-rate-coach.ts`
  - `/hooks/use-booking-detail.ts`
- Result:
  - More consistent in-app feedback behavior during invite accept/decline/counter/reminder and review flows.

4. Bottom toast dwell time reduced
- File: `/components/ui/toast.tsx`
- Change:
  - Default toast duration shortened from 4000ms to 2800ms.
- Result:
  - Less lingering bottom messaging for success/error toasts.

5. Fixed-offering schedule lock in step 2
- File: `/app/book/[coachId]/schedule.tsx`
- Change:
  - When booking context already matches a fixed offering date/time, step 2 no longer renders calendar/time pickers.
  - It now shows a locked summary card and continues directly to details.
- Result:
  - Reduced "why am I picking date/time again?" friction on discover/offering paths.

6. Club ownership surfaced in review + confirmation
- Files:
  - `/app/book/[coachId]/review.tsx`
  - `/app/book/[coachId]/confirmation.tsx`
- Change:
  - Added explicit rows for:
    - `Booked via <Club>`
    - `Delivered by <Coach>`
- Result:
  - Parent gets clear organisation/coaching ownership context before and after confirm.

## Devil's-advocate: still-open gaps after this patch

## P0
1. Discover orchestration is still split across 3 controllers.
- Risk:
  - Flow behavior and filtering can diverge by tab/screen.
- Files:
  - `/hooks/use-bookings-discover.ts`
  - `/hooks/use-discover-sessions.ts`
  - `/components/parent/discover-screen.tsx`

## P1
1. Schedule step still uses coach availability data model for non-locked cases.
- Risk:
  - Users can still choose dates/times outside strict offering instance intent on paths where schedule is not locked.
- File:
  - `/app/book/[coachId]/schedule.tsx`

2. Coach-review pending lifecycle still lacks a hard aging policy.
- Risk:
  - `AWAITING_COMPLETION` can remain indefinitely if coach completion does not happen.
- Files:
  - `/services/booking/booking-status-service.ts`
  - `/utils/booking-display.ts`

## P2
1. Club-admin session creation still has a parallel "existing invite flow" path.
- Risk:
  - Reuse gains are partial; behavior can drift from normal coach creation flow.
- Files:
  - `/app/sessions/create.tsx`
  - `/hooks/use-create-session.ts`
