# 2A: Session Lifecycle Core

**Phase**: 1 — Foundation
**Origin**: Sprint 2, Tasks 1, 2, 3
**Estimated scope**: 3 tasks, coach-side session completion

## Goal

Sessions have a full lifecycle: CONFIRMED → AWAITING_COMPLETION → COMPLETED. Coaches get a fast post-session checklist to mark attendance, write notes, and award badges.

## Tasks

### Task 1: Session Completion Screen

**File**: `app/session/[id]/complete.tsx`

A multi-step flow that coaches see after a session.

**Step 1 — Attendance**
- List all registered athletes
- Toggle: Attended / No-show / Late
- Quick tap UI — large touch targets, swipeable rows

**Step 2 — Quick Notes**
- Per athlete who attended:
  - Effort rating (1-5 stars or emoji scale)
  - Focus areas worked on (multi-select from FootballObjective)
  - One-line improvement note (optional)
  - Homework/drill assignment (optional, pick from drill library)
- Keep it fast — coach shouldn't spend more than 30 seconds per athlete

**Step 3 — Badges (Optional)**
- "Award a badge?" prompt
- Quick-pick from recent/common badges
- One-tap award with auto-reason from session context

**Step 4 — Summary**
- Show what will be shared with parents
- Toggle: share notes with parents (default: yes)
- Toggle: share attendance (default: yes)
- "Complete Session" button

**UI guidance**: This must feel fast and satisfying. Think of it like a coach's clipboard — tap tap tap done. Not a form to fill in. Swipe gestures, smart defaults, minimal typing.

### Task 2: Auto-Transition Booking Status

**File**: `services/booking-service.ts`

Add a method that checks if a session's `scheduledAt + duration` has passed:

```typescript
async checkAndTransitionStatus(bookingId: string): Promise<Booking> {
  const booking = await this.getById(bookingId);
  const sessionEnd = addMinutes(new Date(booking.scheduledAt), booking.duration);

  if (booking.status === 'CONFIRMED' && isPast(sessionEnd)) {
    // Session time has passed — prompt coach to complete
    return this.update(bookingId, { status: 'AWAITING_COMPLETION' });
  }
  return booking;
}
```

Add `AWAITING_COMPLETION` to `BookingStatus` type.

### Task 3: Coach Home — "Sessions to Complete" Card

**File**: `app/(tabs)/index.tsx` (coach view)

Add a prominent card at the top of the coach home screen:

```
┌─────────────────────────────────────┐
│ 📋 2 sessions need completing       │
│                                     │
│ U12 Training — Today 4pm    [→]    │
│ 1:1 with Jake — Today 5pm   [→]    │
│                                     │
│ Tap to mark attendance & add notes  │
└─────────────────────────────────────┘
```

Show bookings with status `AWAITING_COMPLETION`. Each row links to the completion flow.

## Types Changed

```typescript
// Add to BookingStatus
type BookingStatus = 'PENDING' | 'CONFIRMED' | 'AWAITING_COMPLETION' | 'COMPLETED' | 'CANCELLED';

// New type for attendance
interface SessionAttendance {
  bookingId: string;
  records: AttendanceRecord[];
  completedAt: string;
  completedBy: string; // coachId
}

interface AttendanceRecord {
  athleteId: string;
  athleteName: string;
  status: 'ATTENDED' | 'NO_SHOW' | 'LATE';
  notes?: string;
  effortRating?: number; // 1-5
  focusAreas?: string[];
  improvement?: string;
  drillAssigned?: string; // drillId
}
```

## Acceptance Criteria

- [ ] Coach can tap "Complete Session" on any past-due booking
- [ ] Attendance marking screen with attended/no-show/late per athlete
- [ ] Quick notes per athlete (effort, focus, one-liner)
- [ ] Badge awarding integrated into completion flow
- [ ] Session transitions: CONFIRMED → AWAITING_COMPLETION → COMPLETED
- [ ] Coach home shows "sessions to complete" card
- [ ] Flow is fast — coach can complete a 1:1 session in under 30 seconds

## Files Changed

| File | Action |
|------|--------|
| `app/session/[id]/complete.tsx` | ENHANCE (669 lines exist) — add RSVP pre-fill, attendance categories, badge award step |
| `app/(tabs)/index.tsx` | MODIFY — add "sessions to complete" card (coach view) |
| `services/booking-service.ts` | MODIFY — add status transitions + AWAITING_COMPLETION |
| `constants/app-types.ts` | MODIFY — add AWAITING_COMPLETION to BookingStatus |
| `constants/booking-types.ts` | MODIFY — same |

## Dependencies

- **Blocks**: 2B (parent reactions need completed sessions)
- **Blocked by**: 1A (api-client), 1B (need real bookings)
