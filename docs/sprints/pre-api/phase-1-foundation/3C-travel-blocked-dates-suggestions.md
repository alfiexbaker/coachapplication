# 3C: Travel Radius + Blocked Dates + Smart Suggestions

**Phase**: 1 — Foundation
**Origin**: Sprint 3, Tasks 5, 9, 10
**Estimated scope**: 3 tasks, location + availability polish

## Goal

Coach sets travel radius with map preview, blocks holiday dates (with parent notification), and gets smart suggestions on which slots to add/remove.

## Tasks

### Task 1: Travel Radius Setting

**File**: `components/coach/travel-radius-picker.tsx`

- Slider: 1–50 miles (or km toggle)
- Map preview showing radius circle around coach's postcode
- Saves to `coach.travelRadius`

### Task 2: Blocked Dates (Coach Holidays)

**File**: `components/coach/blocked-dates-editor.tsx`

Add to coaching settings hub:
- Date range picker (from / to)
- Optional reason ("Half-term holiday")
- Blocked dates remove coach from availability AND discovery
- Existing bookings in blocked range: warn coach with cancel/keep options
- Upcoming blocked dates shown on coach dashboard
- "Block this week" quick action

**Parent Reaction (Action→Reaction):**

When coach blocks dates that overlap existing bookings:
- **Individual bookings**: Parent notified "Coach Marcus is unavailable on [date]. Your session needs to be rescheduled." + auto-suggest 3 alternative slots from coach's next available
- **Recurring squad sessions**: ALL squad parents notified "U12 Training cancelled for [date range] — Coach is away. Training resumes [next date]."
- Notification includes: [Reschedule] [Cancel Booking] CTAs
- Parent booking screen shows: "Coach unavailable — tap to reschedule"
- Coach MUST acknowledge affected bookings before block is saved (can't silently nuke bookings)

### Task 3: Smart Slot Suggestions

**File**: `components/coach/smart-slots.tsx`

Shown on availability editor:
- Which slots are consistently booked (heatmap)
- "Saturdays 10am: 90% booked → consider adding more"
- "Wednesday eves: 0 bookings → remove or promote"
- "Copy last week's schedule" quick action
- Demand data from search patterns in coach's area

## New Types

```typescript
interface BlockedDateRange {
  id: string;
  coachId: string;
  startDate: string; // ISO date
  endDate: string;
  reason?: string;
}
```

## Acceptance Criteria

- [ ] Coach can set travel radius with visual map preview
- [ ] Coach can block date ranges with reason
- [ ] Blocked dates remove from availability + discovery
- [ ] Affected parents notified when coach blocks dates overlapping bookings
- [ ] Coach must acknowledge affected bookings before block is saved
- [ ] Smart slot suggestions based on booking patterns
- [ ] "Copy last week's schedule" quick action

## Files Changed

| File | Action |
|------|--------|
| `components/coach/travel-radius-picker.tsx` | CREATE |
| `components/coach/blocked-dates-editor.tsx` | ENHANCE existing `app/availability/block-date.tsx` |
| `components/coach/smart-slots.tsx` | CREATE |
| `services/availability-service.ts` | MODIFY — respect blocked dates |

## Dependencies

- **Blocks**: Nothing
- **Blocked by**: 3A (needs settings hub)
