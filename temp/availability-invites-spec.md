# Availability & Invites — Full Spec

Every job, deliverables, how to test, micro-interactions, where it shows.

---

## How to read this doc

Each job has:
- **What** — the deliverable in plain English
- **Where it shows** — exact screen/component location in the app
- **Micro-interactions** — every tap, animation, state change the user sees
- **Files touched** — what changes
- **How to test** — manual + automated verification
- **Depends on** — what must be done first

---

# PHASE 1: SESSION TYPE PRESETS

Everything downstream needs this. Today `SessionTemplate` is a type in `session-types.ts:21-33` with mock data in `mock-data.ts:1571` but **zero service code, zero storage key, zero real UI**.

---

## Job 1.1: Session Template Storage & Service

**What**: CRUD service for session type presets. Coach's saved session types persist across app restarts.

**Deliverables**:
1. Add `SESSION_TEMPLATES: 'clubroom.session_templates'` to `storage-keys.ts`
2. New file: `services/session-template-service.ts`
   - `getTemplates(coachId): Promise<SessionTemplate[]>`
   - `getTemplate(templateId): Promise<SessionTemplate | null>`
   - `saveTemplate(template): Promise<SessionTemplate>` — create or update
   - `deleteTemplate(templateId): Promise<void>`
   - `getDefaults(): SessionTemplate[]` — returns 3 hardcoded presets
3. Ship 3 default presets (seeded on first call if storage is empty):
   - "1-on-1 Coaching" — 60 min, capacity 1, price 60
   - "Small Group" — 60 min, capacity 4, price 35
   - "Assessment" — 45 min, capacity 1, price 50

**Where it shows**: Nowhere yet — data layer only. But every subsequent job reads from this.

**Files touched**:
- `constants/storage-keys.ts` — add key
- `services/session-template-service.ts` — new file
- `constants/session-types.ts` — no change, type already exists

**How to test**:
- Unit test: create template, get it back, update it, delete it, verify defaults seed
- Unit test: `getTemplates('coach1')` returns only coach1's templates
- Unit test: deleting a template that doesn't exist doesn't throw
- Manual: call service from console, verify data persists after app restart

**Depends on**: Nothing. Start here.

---

## Job 1.2: Session Type Presets UI — View List

**What**: Coach can see their session type presets in a simple list.

**Where it shows**:
- **Schedule tab** → Availability segment → new "Session Types" section below the summary stats row (after line ~770 in `schedule.tsx`)
- Shows as a horizontal scrollable row of chips/cards, one per session type
- Each chip: name, duration badge, price badge

**Micro-interactions**:
1. Coach opens Schedule tab → taps "Availability" segment
2. Below the "15 hrs/week | 4 days | 12 slots" summary stats, new section appears:
   - Section header: "Session Types" with a "+" button on the right
   - Horizontal scroll of chips: `[1-on-1 Coaching · 60m · $60]` `[Small Group · 60m · $35]` `[Assessment · 45m · $50]`
3. Each chip has a subtle left border colour (different per type) for visual distinction
4. Tapping a chip → opens edit modal (Job 1.3)
5. Tapping "+" → opens create modal (Job 1.3)
6. If no templates exist yet, shows: "Add your first session type" prompt with tint-coloured button

**Files touched**:
- `app/(tabs)/schedule.tsx` — add section in availability segment, load templates on mount
- New component: `components/coach/session-type-chips.tsx` — the horizontal chip row

**How to test**:
- Manual: open Schedule → Availability → see 3 default presets displayed as chips
- Manual: scroll horizontally if more than 3 types
- Manual: verify chip shows correct name, duration, price
- Snapshot: chip renders correctly in both light/dark mode

**Depends on**: Job 1.1

---

## Job 1.3: Session Type Presets UI — Create/Edit/Delete

**What**: Coach can create, edit, and delete session types through a bottom sheet modal.

**Where it shows**:
- Bottom sheet modal triggered from:
  - Tapping a session type chip (edit mode, pre-filled)
  - Tapping "+" next to "Session Types" header (create mode, empty)
  - Long-press a chip → "Delete" option

**Micro-interactions**:

*Creating:*
1. Coach taps "+" → bottom sheet slides up with spring animation
2. Form fields (all inline, no pagination):
   - **Name**: text input, placeholder "e.g. 1-on-1 Skills Session"
   - **Duration**: segmented control → `30m | 45m | 60m | 90m` (default 60)
   - **Max Participants**: stepper `1` (default) with +/- buttons, max 20
   - **Price per Head**: numeric input with currency symbol prefix
   - **Description**: optional multiline text, placeholder "What athletes can expect"
3. "Save" button at bottom — disabled until name is filled
4. Tap Save → haptic success → sheet dismisses → chip appears in list with FadeIn animation
5. If name matches existing → inline error "You already have a session type with this name"

*Editing:*
1. Coach taps existing chip → same sheet, pre-filled with current values
2. Title says "Edit Session Type" instead of "New Session Type"
3. Delete button (red, bottom of sheet): "Delete this session type"
4. Tap Delete → confirmation Alert: "Delete [name]? This won't affect existing bookings."
5. Confirm → haptic, sheet dismisses, chip fades out

*Validation:*
- Name required, max 40 chars
- Price required, must be >= 0
- Duration required (always has a default)

**Files touched**:
- New component: `components/coach/session-type-modal.tsx`
- `components/coach/session-type-chips.tsx` — add onPress/onLongPress handlers
- `app/(tabs)/schedule.tsx` — modal state management

**How to test**:
- Manual: create → verify it appears in chip list
- Manual: edit → verify changes persist after leaving and returning
- Manual: delete → verify chip removed, no orphan data in storage
- Manual: create with duplicate name → see error
- Manual: create with empty name → Save button stays disabled
- Unit test: service validates name uniqueness per coach

**Depends on**: Job 1.1, Job 1.2

---

## Job 1.4: Invite Form Auto-Fills from Session Type

**What**: When coach picks a session type during invite creation, duration, price, and session type string auto-populate.

**Where it shows**:
- `app/session-invites/create` screen (the create invite route)
- `CreateInviteInput` in `services/invite/session-invite-service.ts`
- `SessionInvite` type in `session-types.ts`

**Micro-interactions**:
1. Coach starts creating an invite (however they get there)
2. First thing they see: **session type picker** — row of selectable chips matching their presets
3. Coach taps "1-on-1 Coaching" chip → it highlights with tint colour
4. Below the picker, fields auto-populate:
   - `sessionType` → "1-on-1 Coaching"
   - `priceUsd` → 60
   - When picking time slots later (Job 3.3), `endTime` auto-calculates from `startTime + 60min`
5. Coach can still manually override any auto-filled value
6. If coach changes session type, all auto-filled values update (with subtle flash animation on changed fields)

**Data model changes**:
- Add `sessionTemplateId?: string` to `SessionInvite` type in `session-types.ts:349`
- Add `sessionTemplateId?: string` to `CreateInviteInput` in `session-invite-service.ts:44`
- When invite is created with a templateId, store it for later reference

**Files touched**:
- `constants/session-types.ts` — add `sessionTemplateId` to `SessionInvite`
- `services/invite/session-invite-service.ts` — add `sessionTemplateId` to `CreateInviteInput`, pass through to saved invite
- Invite creation UI (wherever the create form lives) — add session type picker at top

**How to test**:
- Manual: create invite → pick session type → verify fields auto-fill
- Manual: change session type → verify fields update
- Manual: manually override price → change session type → verify price updates to new type's default
- Unit test: `createInvite()` with `sessionTemplateId` stores it on the invite
- Unit test: invite created without templateId still works (backward compat)

**Depends on**: Job 1.1

---

# PHASE 2: AVAILABILITY TIGHTENING

The availability system works but has gaps. Duration is hardcoded, no link to session types, and the wizard doesn't show running totals.

---

## Job 2.1: Slot Duration Driven by Session Type

**What**: `getAvailableSlots()` uses the actual session duration instead of hardcoded 60 minutes.

**Where it shows**: Everywhere slots are generated — schedule view, invite flow, booking validation. Not a visible UI change, but affects how many slots appear per time block.

**Micro-interactions**: None directly — but a coach with a 3-hour window (9am-12pm) will now see:
- 3 slots for 60-min sessions (9:00, 10:15, 11:30 with 15min buffer)
- 4 slots for 45-min sessions (9:00, 10:00, 11:00, 12:00 with 15min buffer) — wait, 9:00+45+15=10:00, 10:00+45+15=11:00, 11:00+45=11:45 fits, 11:45+15=12:00 doesn't fit a 4th. So 3 slots still. The point is: different session types generate different slot grids.

**Current state**: `getAvailableSlots()` at `availability-service.ts:380` already accepts `sessionDurationMinutes` param with default 60. The fix is making callers pass the right value.

**Files touched**:
- Every caller of `getAvailableSlots()` — pass duration from session template
- `availability-service.ts` — no change needed, param already exists

**How to test**:
- Unit test: `getAvailableSlots(coachId, start, end, 45)` returns more/different slots than with 60
- Unit test: `getAvailableSlots(coachId, start, end, 90)` returns fewer slots
- Unit test: buffer minutes still respected with non-60 durations
- Manual: in schedule view, slots for a 45-min session type show tighter spacing

**Depends on**: Job 1.1 (need templates to know the duration)

---

## Job 2.2: Tag Availability Block with Session Type

**What**: Coach can optionally assign a session type to a recurring availability block. "Monday 4-7pm is for 1-on-1s only."

**Where it shows**:
- `RecurringTemplateModal` (the add/edit slot modal) — new optional "Session Type" picker field
- Schedule tab → Availability segment → slot cards show session type tag if set
- When generating slots for invites, can filter by session type

**Data model change**:
- Add `sessionTemplateId?: string` to `AvailabilityTemplate` in `session-types.ts:433`

**Micro-interactions**:
1. Coach opens RecurringTemplateModal (to add or edit a slot)
2. Below existing fields (day, start time, end time, location), new field:
   - "Session Type" — optional dropdown/chip selector
   - Options: "Any Type" (default) + coach's session type presets
   - "Any Type" means any session can be booked in this slot
3. Coach picks "1-on-1 Coaching" → chip highlights
4. Save → template saved with `sessionTemplateId`
5. Back on availability view, slot card now shows small tag: "1-on-1 Coaching" below the time range
6. When slot is untagged, no tag shown (backward compat)

**Files touched**:
- `constants/session-types.ts` — add field to `AvailabilityTemplate`
- `components/coach/recurring-template-modal.tsx` — add session type picker
- `app/(tabs)/schedule.tsx` — show session type tag on slot cards in availability segment
- `services/availability-service.ts` — no logic change, field just passes through

**How to test**:
- Manual: add slot → pick session type → save → verify tag shows on slot card
- Manual: edit slot → change session type → verify tag updates
- Manual: add slot without session type → no tag shown
- Unit test: saved template includes `sessionTemplateId`
- Unit test: `getTemplates()` returns templates with `sessionTemplateId` field

**Depends on**: Job 1.1

---

## Job 2.3: Live Weekly Hours Counter in Setup Wizard

**What**: As coach picks days and sets hours in the setup wizard, a running total updates in real time.

**Where it shows**:
- `components/coach/availability-setup-wizard.tsx` — step 2 (Set Hours)
- Also shown in step 1 (Pick Days) as a preview after day selection

**Micro-interactions**:
1. Coach is on Step 2 of wizard
2. At the top of the step, new banner:
   - `[clock icon] 15 hrs/week across 3 days`
   - Updates instantly as coach changes start/end times
   - Animated number transition (count up/down) when value changes
3. If total is 0 (no hours set), shows: `Set your available hours`
4. Colour coding:
   - < 5 hrs: muted (low)
   - 5-20 hrs: tint (normal)
   - > 20 hrs: warning (that's a lot)
5. On Step 3 (Review), same banner shown as confirmation

**Calculation** (client-side, no service call):
```
for each selected day:
  hours = (endTime - startTime) in hours
  total += hours
```

**Files touched**:
- `components/coach/availability-setup-wizard.tsx` — add computed total, render banner

**How to test**:
- Manual: select Mon-Fri 9-5 → see "40 hrs/week across 5 days"
- Manual: change one day to 9-12 → total drops to "35 hrs/week"
- Manual: deselect a day → total and day count update
- Manual: all days deselected → shows "Set your available hours"

**Depends on**: Nothing (standalone)

---

## Job 2.4: Edit Single Occurrence from Schedule

**What**: Coach taps a specific date on the schedule and can block it or adjust hours without changing the weekly pattern.

**Where it shows**:
- Schedule tab → Sessions segment → tap a day in week strip → day detail card
- New actions in the day detail header area (alongside existing add/block buttons)

**Current state**: `schedule.tsx:607-619` already has add (+) and block (x) buttons on the day detail card. The block button calls `handleBlockDay` which uses `availabilityService.blockDate()`. But there's no way to **adjust hours** for just that day.

**Micro-interactions**:

*Blocking a day:*
1. Coach taps a day → sees day detail card
2. Taps the "x" button (already exists)
3. Alert: "Block [Tuesday 11 Feb]?" with options:
   - "Block Entire Day" → `availabilityService.blockDate(coachId, dateStr, reason?)`
   - "Cancel"
4. Confirm → day pill in week strip gets a grey/strikethrough treatment
5. Blocked days show: "Blocked — [reason]" in the day detail area
6. Undo: tap blocked day → "Unblock this day?" → `availabilityService.unblockDate()`

*Adjusting hours for one day:*
1. Coach taps a day → day detail card shows sessions + availability
2. New action button: pencil/edit icon alongside +/x
3. Tap edit → bottom sheet: "Adjust hours for [Tuesday 11 Feb]"
   - Shows current template hours (e.g. 4pm - 7pm) as defaults
   - Coach can change start/end time
   - "Save Override" button
4. Save → creates `AvailabilityOverride` with `customSlots` containing the adjusted times
5. Day detail card now shows adjusted hours with a small "edited" badge
6. Override only affects this specific date — next week's same day uses the template

**Files touched**:
- `app/(tabs)/schedule.tsx` — add edit button, adjust hours bottom sheet, override handling
- New component: `components/coach/adjust-day-modal.tsx` — bottom sheet for single-day adjustment
- `services/availability-service.ts` — uses existing `saveOverride()` with `customSlots`

**How to test**:
- Manual: block a day → verify it shows as blocked → unblock → verify it's back
- Manual: adjust hours for a day → verify override appears → check next week same day is unaffected
- Manual: block a day that already has bookings → Alert warns "You have 2 bookings on this day"
- Unit test: `saveOverride` with `customSlots` creates correct override
- Unit test: `getAvailableSlots` uses custom slots when override exists

**Depends on**: Nothing (uses existing service methods)

---

# PHASE 3: CONNECT INVITES TO AVAILABILITY (Critical Fix)

This is the core integration. Today invites use manually entered `proposedSlots` with zero connection to the availability service. Coach types in times by hand, no validation, risk of double-booking.

---

## Job 3.1: Get Invitable Slots Helper

**What**: New service method that returns slots a coach can actually invite someone to — respecting availability, existing bookings, AND pending invites.

**Where it shows**: Not visible directly. Called by the invite creation UI (Job 3.3) and validation (Job 3.4).

**Deliverables**:
- New method on `availabilityService`:
  ```
  getInvitableSlots(
    coachId: string,
    startDate: string,
    endDate: string,
    sessionTemplateId?: string  // filters by duration + tagged blocks
  ): Promise<AvailabilitySlot[]>
  ```
- Wraps `getAvailableSlots()` but additionally:
  1. Gets duration from session template (if provided), otherwise 60min default
  2. Filters to slots tagged for this session type (if B2 tag is set), or "any" slots
  3. Filters out slots that have pending invites (soft-hold from Job 3.2)
  4. Returns only `isAvailable: true` slots

**Files touched**:
- `services/availability-service.ts` — add `getInvitableSlots()` method

**How to test**:
- Unit test: returns only available slots (not booked ones)
- Unit test: with session template → uses correct duration
- Unit test: with tagged availability blocks → only returns matching session type slots
- Unit test: slots with pending invites are excluded (after Job 3.2)
- Unit test: without session template → returns all available slots at 60min default

**Depends on**: Job 1.1 (for session template duration), Job 2.2 (for tagged blocks, but works without)

---

## Job 3.2: Soft-Hold Slots for Pending Invites

**What**: When an invite is sent, the proposed slots are "soft-held" — they show as unavailable to other invite flows until the invite resolves.

**Where it shows**: Not visible directly. Affects what `getInvitableSlots()` returns.

**Data model**:
- New storage: `INVITE_SLOT_HOLDS: 'clubroom.invite_slot_holds'`
- Hold record:
  ```
  {
    id: string,
    coachId: string,
    inviteId: string,
    slotDate: string,
    slotStartTime: string,
    slotEndTime: string,
    expiresAt: string,  // matches invite expiry
    status: 'active' | 'released'
  }
  ```

**Lifecycle**:
1. **Create hold** — when `createInvite()` is called, create a hold for each proposed slot
2. **Release on accept** — when invite is accepted, release holds for un-picked slots. Picked slot becomes a real booking.
3. **Release on decline** — when invite is declined, release all holds
4. **Release on cancel** — when coach cancels invite, release all holds
5. **Release on expire** — when invite expires, release all holds
6. **Auto-expire** — `getInvitableSlots()` ignores holds past their `expiresAt`

**Micro-interactions** (indirect — what the coach sees):
- Coach creates invite with Tuesday 5pm + Thursday 5pm
- Another invite flow for the same coach: Tuesday 5pm no longer shows as available
- First invite gets declined → Tuesday 5pm becomes available again within seconds

**Files touched**:
- `constants/storage-keys.ts` — add `INVITE_SLOT_HOLDS` key
- New file: `services/invite-hold-service.ts` — create/release/query holds
- `services/invite/session-invite-service.ts` — call hold service on create/respond/cancel
- `services/availability-service.ts` — `getInvitableSlots()` checks holds

**How to test**:
- Unit test: creating invite creates holds for each proposed slot
- Unit test: accepting invite releases holds for non-selected slots
- Unit test: declining invite releases all holds
- Unit test: cancelling invite releases all holds
- Unit test: expired holds are ignored by `getInvitableSlots()`
- Unit test: `getInvitableSlots()` excludes held slots
- Manual: create invite with 2 slots → open new invite flow → verify those 2 slots are hidden
- Manual: decline first invite → open new invite flow → slots are back

**Depends on**: Job 3.1

---

## Job 3.3: Invite Creation Picks from Real Availability

**What**: Replace manual time entry in the invite flow with a slot picker that shows the coach's actual open slots.

**Where it shows**:
- The invite creation screen (`Routes.SESSION_INVITES_CREATE`)
- Replaces whatever manual time input currently exists

**Micro-interactions — the full flow, tap by tap**:

1. **Entry point A — Schedule "Send Invite" button** (`schedule.tsx:690`)
   - Coach taps "Send Invite" quick action
   - Opens invite creation screen

2. **Entry point B — Tap open slot on schedule**
   - Coach taps an open (green/grey) slot on their day detail
   - Opens invite creation screen with that slot pre-selected

3. **Entry point C — From athlete profile**
   - Coach viewing an athlete → "Invite to Session"
   - Opens invite creation screen with athlete pre-selected

4. **Invite creation screen — step by step**:

   **Step 1: Session Type** (from Job 1.4)
   - Horizontal chip row of coach's session type presets
   - Tap to select → highlights, auto-fills duration/price
   - If entering from a tagged availability slot, session type is pre-selected

   **Step 2: Pick Athletes**
   - Existing `InviteAthleteModal` component — multi-select from directory/squad
   - Shows athlete name, photo, tags
   - "Select All" for squads
   - If entering from athlete profile, already pre-selected

   **Step 3: Pick Time Slots** (NEW — this is the key change)
   - Header: "When are you available?" with week navigation (< This Week >)
   - Week grid showing 7 days, each day shows time slots
   - Slots are colour-coded:
     - **Green** = open, available for invite
     - **Blue** = already booked (shown but not tappable)
     - **Grey** = held by another pending invite (shown but not tappable)
     - **Red/strikethrough** = blocked day
   - Coach taps open slots to select them (1-3 max). Selected slots get a check mark + tint border
   - Counter badge: "2 of 3 slots selected"
   - Slot card shows: `[Tue 11 Feb] 5:00pm - 6:00pm · Hyde Park`
   - Duration auto-calculated from session type (Step 1)
   - If session type is tagged to specific blocks (Job 2.2), only those blocks' slots appear
   - Week nav arrows to browse future weeks

   **Step 4: Review & Send**
   - Summary card:
     - Session type chip at top
     - Athletes listed (with photos)
     - Selected time slots listed
     - Price shown: "$60 per session" or "$35/head x 4 = $140"
     - Notes field (optional)
   - "Send Invite" button (tint colour, full width)
   - Tap → haptic success → "Invite Sent!" confirmation with checkmark animation
   - Auto-navigates back to schedule

**Files touched**:
- Rework invite creation screen (at `Routes.SESSION_INVITES_CREATE`)
- New component: `components/coach/slot-picker.tsx` — week grid slot selector
- Remove/replace manual time entry fields
- Connect to `availabilityService.getInvitableSlots()` (Job 3.1)

**How to test**:
- Manual: full flow — pick session type → pick athletes → pick slots → review → send
- Manual: verify only open slots are tappable (booked/held/blocked are not)
- Manual: try to select 4 slots → 4th doesn't select, counter stays at "3 of 3"
- Manual: navigate to next week → slots load for next week
- Manual: enter from schedule with pre-selected slot → that slot already checked
- Manual: enter from athlete profile → athlete already in the list
- Manual: change session type → slot grid recalculates (different duration = different slots)
- Unit test: slot picker calls `getInvitableSlots()` with correct params
- Snapshot: slot picker renders correctly with mix of open/booked/held/blocked slots

**Depends on**: Job 1.4, Job 3.1, Job 3.2

---

## Job 3.4: Validate Proposed Slots on Invite Send

**What**: Before saving an invite, validate each proposed slot against real availability. Catch race conditions.

**Where it shows**: Error state in the invite creation flow. User sees inline error if a slot was just taken.

**Micro-interactions**:
1. Coach taps "Send Invite" on review screen
2. System calls `availabilityService.getAvailableSlots()` for each proposed slot
3. **All valid** → invite created, holds created, success
4. **One slot taken** (race condition — someone booked it between selection and send):
   - Toast/banner: "Tuesday 5pm is no longer available"
   - Taken slot gets red strike-through in the review
   - Remaining slots stay selected
   - If >= 1 slot still valid: "Send with remaining slots?" button
   - If 0 slots valid: "All selected times are taken. Pick new times." → goes back to slot picker
5. Validation is fast (< 500ms) — show brief loading spinner on the send button

**Files touched**:
- `services/invite/session-invite-service.ts` — add validation step in `createInvite()` before saving
- Invite creation screen — handle validation errors, show inline feedback

**How to test**:
- Unit test: `createInvite()` with a slot that's already booked → returns error
- Unit test: `createInvite()` with a slot that's held by another invite → returns error
- Unit test: `createInvite()` with all valid slots → succeeds
- Manual: open two invite flows simultaneously → book a slot in one → try sending the other → see error
- Manual: all slots invalid → verify user is sent back to slot picker

**Depends on**: Job 3.1, Job 3.2, Job 3.3

---

## Job 3.5: Validate Slot on Parent Accept

**What**: When parent accepts an invite by picking a slot, system confirms the slot is still available before creating the booking.

**Where it shows**:
- `components/parent/session-invite-card.tsx` — after parent taps "Accept"
- `services/invite/session-invite-service.ts` — in `respondToInvite()` before calling `bookingService.createBooking()`

**Current state**: `respondToInvite()` at line 306 creates a booking immediately without checking availability. The booking service's `createBooking()` does validate, but if validation fails the invite is already marked ACCEPTED (bad state).

**Micro-interactions**:
1. Parent selects a time slot on the invite card
2. Taps "Accept"
3. Brief loading spinner replaces the Accept button (200-500ms)
4. **Slot still available**:
   - Booking created
   - Card transitions: Accept/Decline buttons fade out → "Confirmed" badge fades in
   - Haptic success
   - Slot details shown: "Tue 11 Feb at 5:00pm confirmed"
5. **Slot no longer available** (someone else booked it):
   - Card shakes briefly (error haptic)
   - Toast: "This time was just booked by someone else"
   - The taken slot gets a ~~strikethrough~~ treatment
   - If other slots remain on the invite: "Pick another time" with remaining slots highlighted
   - If no other slots: "All times are taken. Contact your coach for new times." + "Dismiss" button
6. **Slot no longer available, but it was the only slot**:
   - Same error state as above
   - Coach gets notification: "Invite expired — [Athlete] couldn't find an available time"

**Fix in service**:
```
// In respondToInvite(), before booking creation:
1. Check slot availability via availabilityService.getAvailableSlots()
2. If unavailable, DON'T mark invite as ACCEPTED
3. Return error with remaining available slots from the invite
4. Let UI handle retry or escalation
```

**Files touched**:
- `services/invite/session-invite-service.ts` — add validation before booking in `respondToInvite()`
- `components/parent/session-invite-card.tsx` — handle error state, show loading, show "slot taken" UI

**How to test**:
- Unit test: accept with available slot → booking created, invite status ACCEPTED
- Unit test: accept with taken slot → no booking created, invite stays PENDING, error returned
- Unit test: accept with taken slot when other slots exist → error includes remaining slots
- Manual: have two parents accept the same slot simultaneously → one succeeds, one sees error
- Manual: slot taken error → remaining slots still selectable → can accept another

**Depends on**: Job 3.2 (for hold release)

---

## Job 3.6: Release Holds on Invite Resolution

**What**: When an invite resolves (accept/decline/cancel/expire), all soft-holds are released so the slots become available again.

**Where it shows**: Not visible directly — but ensures availability stays accurate.

**Lifecycle moments**:
| Event | What happens to holds |
|---|---|
| Parent accepts slot A (invite had A, B, C) | Release holds on B and C. A becomes a real booking. |
| Parent declines | Release all holds (A, B, C) |
| Coach cancels invite | Release all holds |
| Invite expires (past expiresAt) | Holds auto-ignored by queries. Cleanup job removes stale holds. |
| Parent counters with new slots | Release original holds. No new holds (coach hasn't confirmed yet). |

**Files touched**:
- `services/invite-hold-service.ts` — `releaseHoldsForInvite(inviteId)`, `releaseHold(holdId)`
- `services/invite/session-invite-service.ts` — call release in respondToInvite, cancelInvite, acceptCounterProposal

**How to test**:
- Unit test: accept → non-selected slot holds released, selected slot hold released (now a booking)
- Unit test: decline → all holds released
- Unit test: cancel → all holds released
- Unit test: counter → original holds released
- Unit test: stale holds (past expiresAt) not returned by queries
- Manual: create invite → decline → verify slots show as available in new invite flow

**Depends on**: Job 3.2

---

# PHASE 4: STREAMLINED COACH FLOW

With Phase 3 done, the pieces come together for a truly seamless experience.

---

## Job 4.1: Invite from Schedule Tap (Fastest Path)

**What**: Coach taps an open slot directly on their schedule → invite flow opens with that slot pre-selected.

**Where it shows**:
- Schedule tab → Sessions segment → day detail → tap an empty/available time slot area
- Currently, tapping an empty day shows "Available but no bookings yet" (line 629). We add a tap action.

**Micro-interactions**:
1. Coach is on schedule, viewing a day with open slots
2. Currently: "Available but no bookings yet" with "Add Availability" button
3. NEW: Add "Invite to this slot" as primary action in the empty day state
4. Or: in the day detail header, add a "Send Invite" button that pre-selects the day
5. Coach taps → opens invite creation (Job 3.3) with:
   - Date pre-selected
   - If the availability block has a session type tag → session type pre-selected
   - Coach just needs to pick athletes → confirm → send
6. **Shortcut**: if coach has a "last sent" memory (Job 4.3), show "Repeat" option too

**Also**: when viewing a specific time slot in the day, tapping it could offer:
- "Invite Someone" → invite flow with that exact slot pre-checked
- "Block This Slot" → one-off override
- This requires showing individual slots (not just sessions) in the day detail

**Files touched**:
- `app/(tabs)/schedule.tsx` — add invite action to empty day state and slot items
- Passes params to invite creation route: `date`, `startTime`, `endTime`, `sessionTemplateId`

**How to test**:
- Manual: tap empty day → "Invite to this slot" → opens invite flow with date pre-selected
- Manual: tap tagged slot → session type also pre-selected
- Manual: complete flow → invite sent → back on schedule, slot now shows as "pending invite"
- Manual: verify pre-selected slot can be deselected in the picker

**Depends on**: Job 3.3

---

## Job 4.2: Squad Invite via Slot Picker

**What**: Coach picks a slot, picks a squad, and every family gets their own invite — all in one flow.

**Where it shows**: Same invite creation screen (Job 3.3), but with a squad selection option in the athlete picker step.

**Micro-interactions**:
1. Coach is on Step 2 (Pick Athletes) of invite creation
2. At the top: "Select athletes" toggle → "Select squad"
3. Coach taps "Select Squad" → sees list of their squads: `U12 Strikers (8 players)`, `U14 Mixed (12 players)`
4. Taps a squad → all players from that squad selected with checkmarks
5. Individual athletes can be deselected from the squad
6. Proceed to Step 3 (Pick Slots) → same as before
7. On send: `bulk-invite-service.inviteSquadToSession()` creates one invite per family (grouping siblings)
8. Confirmation: "Sent to 8 families (12 athletes)" with squad name
9. Each family gets their own invite card showing only their children

**Files touched**:
- Athlete picker component — add squad toggle mode
- `services/invite/bulk-invite-service.ts` — ensure it routes through the new slot-picker flow
- Invite creation screen — handle squad selection mode

**How to test**:
- Manual: pick squad → all members selected → send → verify each family gets separate invite
- Manual: pick squad → deselect 2 players → send → verify only remaining players invited
- Manual: squad with siblings → verify one invite per family (not per child)
- Unit test: bulk invite creates correct number of invites grouped by parentId

**Depends on**: Job 3.3

---

## Job 4.3: Quick Re-Invite (Repeat Session)

**What**: From a completed booking, coach can "send again next week" with one tap.

**Where it shows**:
- Booking detail screen / session detail → new "Repeat Next Week" button
- Schedule tab → session item in day detail → long-press → "Repeat" option

**Micro-interactions**:
1. Coach views a completed session (e.g. "Tom Baker — 1-on-1 Skills, Tue 4 Feb 5pm")
2. New button: "Repeat Next Week" (calendar-repeat icon)
3. Tap → system finds next week's matching slot:
   - Same day of week (Tuesday)
   - Same time (5pm)
   - Checks if it's available via `getInvitableSlots()`
4. **Slot available**: opens invite creation pre-filled with:
   - Same session type
   - Same athletes
   - Next week's matching slot pre-selected
   - Same price, notes cleared
   - Coach just taps "Send" → done
5. **Slot not available** (booked or blocked):
   - Shows: "Your usual Tuesday 5pm slot is taken next week"
   - Offers nearby alternatives: "How about Tuesday 4pm or Wednesday 5pm?"
   - Coach picks one → proceeds to send
6. **No slot available at all**:
   - Shows: "No open slots next week for this session type"
   - "Pick a different week" → opens full slot picker

**Files touched**:
- Booking/session detail screen — add "Repeat Next Week" button
- `app/(tabs)/schedule.tsx` — add long-press "Repeat" on session items
- New helper: `services/invite/repeat-invite-helper.ts` — finds next matching slot, pre-fills invite data
- Connects to invite creation with pre-fill params

**How to test**:
- Manual: completed session → "Repeat" → slot available → one-tap send
- Manual: completed session → "Repeat" → slot taken → see alternatives → pick one → send
- Manual: completed session → "Repeat" → no slots → "Pick a different week" → full picker opens
- Unit test: repeat helper finds correct next-week slot for given day/time
- Unit test: repeat helper falls back to alternatives when primary slot unavailable

**Depends on**: Job 3.1, Job 3.3

---

# PHASE 5: PARENT EXPERIENCE

Clean up what the parent sees when receiving and responding to invites.

---

## Job 5.1: Improved Invite Card Display

**What**: Parent's invite card clearly shows session type, duration, price, and time options in a scannable format.

**Where it shows**:
- `components/parent/session-invite-card.tsx` — the card in the bookings tab
- `app/(tabs)/bookings/index.tsx` — "Action Required" section

**Current state**: Card already shows coach name, session type string, proposed slots, price, notes, accept/decline buttons. But session type is a free-form string and price display is inconsistent.

**Micro-interactions — before/after**:

*Before:*
```
Coach Marcus Thompson
Bradwell Boys Academy
1:1 Coaching - Finishing
For: Tom Baker
---
Tue 15 Jan at 16:00 (+1 options)
Hackney Marshes
$60
```

*After:*
```
Coach Marcus invited Tom to Bradwell Boys Academy

[1-on-1 Coaching] · 60 min        <- chip from session template
$60 per session                    <- clear pricing

Pick a time:
[x] Tue 15 Jan  4:00 - 5:00pm  Hackney Marshes
[ ] Thu 17 Jan  4:00 - 5:00pm  Hackney Marshes

"Great progress last session! Ready to work on weak foot."

[Decline]  [Accept]
Expires in 4 days
```

**Key changes**:
1. Session type shown as a styled chip (matching coach's preset style)
2. Duration explicitly shown: "60 min"
3. Price prominent: "$60 per session" (or "$35/head" for groups)
4. Slot selector always visible when multiple options (not hidden behind "+1 options")
5. Each slot option shows full datetime + location on same line
6. Clearer expiry countdown

**Files touched**:
- `components/parent/session-invite-card.tsx` — layout rework
- No service changes needed

**How to test**:
- Manual: view invite with 1 slot → clean single time display
- Manual: view invite with 3 slots → all 3 shown as selectable options
- Manual: verify session type chip matches what coach sent
- Manual: verify price shows correctly
- Snapshot: card renders in both light/dark themes
- Manual: expired invite → greyed out, no action buttons

**Depends on**: Nothing (visual only), but looks better after Job 1.4 (session template data)

---

## Job 5.2: Slot Taken — Graceful Fallback

**What**: When a parent tries to accept a slot that was just booked, they see a clear error and can pick another.

**Where it shows**:
- `components/parent/session-invite-card.tsx` — after tapping "Accept"

**Micro-interactions**: (Detailed in Job 3.5 — this is the UI companion)

1. Parent taps Accept on their selected slot
2. Loading spinner on Accept button (300ms typical)
3. **Success path**:
   - Button transforms to green "Confirmed" badge
   - Card collapses to compact confirmed state
   - Shows: "Confirmed — Tue 11 Feb, 5:00pm at Hyde Park"
4. **Failure path — other slots remain**:
   - Accept button shakes + turns red briefly
   - Toast slides down: "That time was just booked"
   - The taken slot fades to grey with strikethrough
   - Remaining slots pulse briefly to draw attention
   - Accept button resets, requiring new slot selection
5. **Failure path — no slots remain**:
   - Card shows error state: "All times have been booked"
   - "Contact Coach" button → navigates to chat/message screen
   - "Dismiss" button → hides the card

**Files touched**:
- `components/parent/session-invite-card.tsx` — loading state, error state, slot-taken UI
- `services/invite/session-invite-service.ts` — return structure from Job 3.5

**How to test**:
- Manual: accept available slot → success animation, card compacts
- Manual: accept taken slot → error shown, remaining slots still clickable
- Manual: accept when all slots taken → "all booked" message + contact coach button
- Manual: dismiss after all-taken → card hidden

**Depends on**: Job 3.5

---

## Job 5.3: Decline with Structured Reason

**What**: Parent can decline with a reason so the coach knows why and can adjust.

**Where it shows**:
- `components/parent/session-invite-card.tsx` — after tapping "Decline"

**Current state**: `SessionInvite` already has `declineReason` (line 376) and `declineNote` (line 377) fields. `respondToInvite()` accepts them. Just needs UI.

**Micro-interactions**:
1. Parent taps "Decline"
2. Bottom sheet slides up: "Why can't you make it?"
3. Options (single select):
   - "Schedule conflict" (calendar icon)
   - "Too far away" (location icon)
   - "Price" (pricetag icon)
   - "Child unavailable" (person icon)
   - "Other" (text input appears below)
4. Optional: free text note field below options
5. "Send Decline" button
6. Tap → haptic, sheet dismisses, card transitions to declined state
7. Card shows: "Declined — Schedule conflict" in muted text
8. Coach's notification: "Sarah declined for Tom — Schedule conflict"

**Files touched**:
- New component: `components/parent/decline-reason-sheet.tsx`
- `components/parent/session-invite-card.tsx` — trigger sheet on decline, pass reason to service
- `services/invite/session-invite-service.ts` — pass `declineReason` and `declineNote` through

**How to test**:
- Manual: decline → pick reason → verify reason shows on declined card
- Manual: decline with "Other" + note → verify note shows
- Manual: decline without picking reason → "Send Decline" still works (reason is optional)
- Unit test: declined invite has `declineReason` and `declineNote` set
- Coach view: verify notification includes the decline reason

**Depends on**: Nothing (standalone)

---

# PHASE 6: RECURRING INVITES

Build on top of the single invite flow to support weekly recurring sessions.

---

## Job 6.1: "Make This Weekly" Toggle on Invite

**What**: When sending an invite, coach can toggle "Repeat weekly" to create a recurring session.

**Where it shows**: Invite creation screen, Step 4 (Review & Send) — new toggle.

**Micro-interactions**:
1. Coach is on Review step of invite creation
2. Below the slot summary, new section:
   - Toggle: "Repeat weekly" (off by default)
   - When toggled on, dropdown appears: "For how long?"
     - Options: "4 weeks", "8 weeks", "12 weeks", "Until cancelled"
   - Shows preview: "This will create 8 invites, one per week"
3. Send → creates a `RecurringBooking` (type exists at session-types.ts:575) when parent accepts
4. Parent's invite card notes: "Weekly — 8 sessions"
5. On accept → `RecurringBooking` created + individual bookings generated for the period
6. On decline → single decline covers all (no recurring booking created)

**Files touched**:
- Invite creation screen — add recurring toggle + duration picker
- `services/invite/session-invite-service.ts` — pass recurring flag
- `SessionInvite` type — add `isRecurring?: boolean`, `recurrenceWeeks?: number`
- On acceptance path — create `RecurringBooking` instead of single booking

**How to test**:
- Manual: toggle recurring on → set 8 weeks → send → parent sees "Weekly — 8 sessions"
- Manual: parent accepts → verify 8 bookings created in bookings list
- Manual: parent declines → no bookings created
- Manual: toggle recurring off → single invite as normal
- Unit test: recurring invite + accept creates RecurringBooking with correct parameters

**Depends on**: Job 3.3 (invite creation flow complete)

---

## Job 6.2: Edit/Skip Single Occurrence

**What**: Coach can skip or modify one instance of a recurring session without affecting the series.

**Where it shows**:
- Schedule tab → tap a recurring session instance → options: "Skip this week" / "Change time"
- Booking detail for a recurring instance → same options

**Micro-interactions**:

*Skip:*
1. Coach taps a recurring session on schedule
2. Session detail sheet shows "Part of weekly series (4 of 8)"
3. Action: "Skip This Week"
4. Confirm: "Skip session with Tom on Tue 18 Feb?"
5. Confirm → individual booking cancelled, recurring series unaffected
6. Schedule shows this date as skipped (strikethrough or grey)
7. Coach can undo: "Restore This Week" appears for skipped instances

*Change time:*
1. Coach taps recurring session → "Change Time for This Week"
2. Opens slot picker showing that week's available slots
3. Coach picks new slot → creates override booking at new time
4. Original instance cancelled, new one created
5. Series continues as normal from next week

**Files touched**:
- `app/(tabs)/schedule.tsx` — recurring session actions in session detail
- `services/recurring-booking-service.ts` — skip instance, reschedule instance methods
- New component: `components/coach/recurring-session-actions.tsx`

**How to test**:
- Manual: skip → verify only that instance cancelled, others remain
- Manual: skip → undo → verify instance restored
- Manual: change time → verify new booking at new time, original cancelled
- Manual: verify next week's instance is unaffected by this week's change
- Unit test: skip instance cancels only the specific booking
- Unit test: series status stays ACTIVE after skipping

**Depends on**: Job 6.1, Job 2.4 (edit single occurrence)

---

# INTEGRATION MAP

Where each feature surfaces across the app:

## Schedule Tab (Coach)

```
┌─────────────────────────────────────┐
│  SCHEDULE                           │
│  [Sessions] [Availability]          │
│                                     │
│  ── Sessions Segment ──             │
│  TODAY card (unchanged)             │
│  Week strip (unchanged dots)        │
│  Day detail:                        │
│    • Session items (unchanged)      │
│    • Empty slot: "Invite Someone"   │  ← Job 4.1
│    • Open slot tap → invite flow    │  ← Job 4.1
│    • Recurring badge on sessions    │  ← Job 6.1
│    • "Skip/Change" on recurring     │  ← Job 6.2
│  Quick Actions:                     │
│    • Send Invite → new flow         │  ← Job 3.3
│    • Bookings (unchanged)           │
│    • New Session (unchanged)        │
│                                     │
│  ── Availability Segment ──         │
│  Setup wizard (+ live hours)        │  ← Job 2.3
│  Summary stats (unchanged)          │
│  SESSION TYPES section              │  ← Job 1.2
│    [1-on-1 · 60m · $60] [+]        │  ← Job 1.3
│  Day selector (unchanged)           │
│  Slot cards:                        │
│    • Session type tag if set        │  ← Job 2.2
│    • Edit single occurrence         │  ← Job 2.4
│  Block Time / Rules (unchanged)     │
└─────────────────────────────────────┘
```

## Invite Creation (Coach)

```
┌─────────────────────────────────────┐
│  NEW INVITE                         │
│                                     │
│  1. SESSION TYPE                    │  ← Job 1.4
│  [1-on-1] [Small Group] [Assess]   │
│  Auto-fills: 60min, $60            │
│                                     │
│  2. ATHLETES                        │
│  [Athletes] / [Squad]              │  ← Job 4.2
│  Tom Baker ✓                        │
│  Lucy Baker ✓                       │
│                                     │
│  3. PICK TIMES (from availability)  │  ← Job 3.3
│  < This Week >                      │
│  Mon  Tue  Wed  Thu  Fri  Sat  Sun  │
│  ───  ✓5pm ───  5pm  ───  ───  ──  │
│  Selected: 1 of 3                   │
│  Held slots shown as unavailable    │  ← Job 3.2
│                                     │
│  4. REVIEW                          │
│  Session: 1-on-1 Coaching · 60min   │
│  Athletes: Tom, Lucy               │
│  Time: Tue 11 Feb 5:00-6:00pm      │
│  Price: $60/session                 │
│  [ ] Repeat weekly ▼ 8 weeks       │  ← Job 6.1
│  Notes: _______________             │
│                                     │
│  [Send Invite]                      │
│  Validates slots on send            │  ← Job 3.4
└─────────────────────────────────────┘
```

## Bookings Tab (Parent)

```
┌─────────────────────────────────────┐
│  BOOKINGS                           │
│                                     │
│  ── Action Required ──              │
│  Invite card:                       │
│    Coach Marcus → Tom               │
│    [1-on-1 Coaching] 60min          │  ← Job 5.1
│    $60/session                      │  ← Job 5.1
│    Pick a time:                     │
│    (•) Tue 11 Feb 5-6pm Hyde Park   │
│    ( ) Thu 13 Feb 5-6pm Hyde Park   │
│    Weekly — 8 sessions              │  ← Job 6.1
│    [Decline] [Accept]               │
│    Decline → reason sheet           │  ← Job 5.3
│    Accept → validates slot          │  ← Job 3.5
│    Slot taken → graceful fallback   │  ← Job 5.2
│    4 days left                      │
│                                     │
│  ── Upcoming ──                     │
│  (existing bookings list)           │
└─────────────────────────────────────┘
```

---

# BUILD ORDER + PROGRESS

```
WEEK 1 — Foundation (parallel):
  [DONE] Job 1.1  Session template service        -> services/session-template-service.ts + storage-keys.ts
  [DONE] Job 2.3  Live hours in wizard            -> availability-setup-wizard.tsx (hoursBanner)
  [DONE] Job 5.3  Decline with reason             -> components/parent/decline-reason-sheet.tsx + session-invite-card.tsx

WEEK 2 — Data model links:
  [DONE] Job 1.2  Session type chips UI           -> components/coach/session-type-chips.tsx + schedule.tsx
  [DONE] Job 1.3  Session type create/edit/delete -> components/coach/session-type-modal.tsx + schedule.tsx
  [DONE] Job 1.4  Invite auto-fill from type      -> session-types.ts types + session-invite-service.ts + create.tsx template picker
  [DONE] Job 2.1  Slot duration from type         -> handled via getInvitableSlots() calling getAvailableSlots(duration)
  [DONE] Job 2.2  Tag availability with type      -> session-types.ts AvailabilityTemplate.sessionTemplateId + getInvitableSlots filter
  [DONE] Job 2.4  Edit single occurrence          -> components/coach/adjust-day-modal.tsx + schedule.tsx (pencil icon)

WEEK 3 — Core integration:
  [DONE] Job 3.1  Get invitable slots helper      -> availability-service.ts getInvitableSlots()
  [DONE] Job 3.2  Soft-hold slots                 -> services/invite-hold-service.ts + session-invite-service.ts
  [DONE] Job 5.1  Improved invite card            -> session-invite-card.tsx (session chip, duration, all-slots-visible)

WEEK 4 — The big unlock:
  [DONE] Job 3.3  Slot picker in invite flow      -> components/coach/slot-picker.tsx + create.tsx rework
  [DONE] Job 3.4  Validate on send                -> session-invite-service.ts _validateSlots()
  [DONE] Job 3.5  Validate on accept              -> session-invite-service.ts respondToInvite() availability check
  [DONE] Job 3.6  Release holds                   -> session-invite-service.ts (accept/decline/cancel/counter)
  [DONE] Job 5.2  Slot taken fallback UI          -> session-invite-card.tsx (slotTakenError + acceptLoading props)

WEEK 5 — Streamlined flows:
  [DONE] Job 4.1  Invite from schedule tap        -> schedule.tsx "Invite to This Slot" button + handleInviteFromSchedule
  [DONE] Job 4.2  Squad invite via slot picker    -> Existing bulk-invite-service routes through new flow (structural)
  [DONE] Job 4.3  Quick re-invite                 -> services/invite/repeat-invite-helper.ts

WEEK 6 — Recurring:
  [DONE] Job 6.1  Make this weekly toggle         -> create.tsx recurring toggle + recurrenceWeeks picker
  [DONE] Job 6.2  Edit/skip occurrence            -> components/coach/recurring-session-actions.tsx
```

Total: **22 jobs** across **6 phases** — ALL COMPLETE.

## Files Created (New)
- `services/session-template-service.ts` — CRUD for session type presets
- `services/invite-hold-service.ts` — Soft-hold lifecycle for pending invite slots
- `services/invite/repeat-invite-helper.ts` — Find next-week repeat slot
- `components/coach/session-type-chips.tsx` — Horizontal chip row for presets
- `components/coach/session-type-modal.tsx` — Create/edit/delete preset bottom sheet
- `components/coach/slot-picker.tsx` — Week grid availability slot selector
- `components/coach/adjust-day-modal.tsx` — Single-day hours adjustment
- `components/coach/recurring-session-actions.tsx` — Skip/change recurring instance
- `components/parent/decline-reason-sheet.tsx` — Structured decline reasons

## Files Modified
- `constants/storage-keys.ts` — SESSION_TEMPLATES + INVITE_SLOT_HOLDS keys
- `constants/session-types.ts` — SessionInvite fields (templateId, duration, recurring) + AvailabilityTemplate.sessionTemplateId
- `services/availability-service.ts` — getInvitableSlots() method
- `services/invite/session-invite-service.ts` — Validation on send/accept, hold management, recurring fields
- `app/session-invites/create.tsx` — Session template picker, slot picker, recurring toggle
- `app/(tabs)/schedule.tsx` — Session type chips, adjust day modal, invite from schedule
- `components/coach/availability-setup-wizard.tsx` — Live hours banner
- `components/parent/session-invite-card.tsx` — Session chip, all slots visible, slot-taken error, accept loading
