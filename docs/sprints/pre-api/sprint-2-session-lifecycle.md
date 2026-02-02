# Sprint 2: Session Lifecycle Completion

## Goal

A session has a full lifecycle: CONFIRMED → IN_PROGRESS → COMPLETED. Coaches can mark attendance, write notes, award badges. Parents get prompted to review. No session just sits forever in "confirmed".

## User Stories This Sprint Fixes

| Role | Story | Current State |
|------|-------|---------------|
| **Coach** | After a session, I want to mark who showed up | ❌ No UI |
| **Coach** | I want to write session notes for each athlete | ✅ Service exists, needs flow trigger |
| **Coach** | I want to award badges based on the session | ✅ Works, needs flow trigger |
| **Coach** | I want to see a post-session checklist so I don't forget anything | ❌ Doesn't exist |
| **Parent** | After my child's session, I want to be prompted to rate the coach | ❌ No prompt |
| **Parent** | I want to see session notes the coach wrote | ✅ Display exists |
| **Parent** | I want to see if my child attended or not | ❌ No attendance display |
| **Athlete** | I want to see a recap of my session | ✅ Recap exists, no lifecycle trigger |

## The Session Lifecycle

```
CONFIRMED (booking exists, session hasn't happened yet)
    │
    ▼  [session time passes]
IN_PROGRESS (session is happening now — auto-transition based on scheduledAt)
    │
    ▼  [coach taps "Complete Session"]
COMPLETING (post-session flow begins)
    │
    ├─→ Step 1: Mark attendance (who showed up?)
    ├─→ Step 2: Quick notes per athlete (effort rating, focus areas)
    ├─→ Step 3: Award badges (optional)
    ├─→ Step 4: Summary & share
    │
    ▼
COMPLETED (session done, notes saved, parent notified)
    │
    ▼  [automatic]
    Parent receives "Rate this session" prompt
```

## Task 1: Session Completion Screen

**File**: `app/session/[id]/complete.tsx`

A multi-step bottom sheet or full-screen flow that coaches see after a session.

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

## Task 2: Auto-Transition Booking Status

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

## Task 3: Coach Home — "Sessions to Complete" Card

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

## Task 4: Parent Review Prompt

**File**: `app/(tabs)/index.tsx` (parent view)

When a session is marked COMPLETED, show a card on the parent home:

```
┌─────────────────────────────────────┐
│ How was Jake's session?             │
│ with Coach Marcus — Today 4pm       │
│                                     │
│ ⭐⭐⭐⭐⭐  [Rate Now]  [Later]     │
└─────────────────────────────────────┘
```

Tapping "Rate Now" opens the existing `rate-coach.tsx` flow.
Tapping "Later" dismisses for 24 hours, then re-prompts once.

## Task 5: Attendance Display for Parents

**File**: `app/booking/[id].tsx`

In the booking detail screen, after session is completed, show:

```
Attendance: ✅ Attended
Coach notes: "Great focus on passing today..."
Effort: ⭐⭐⭐⭐ (4/5)
Skills worked: Passing, First Touch
```

## Acceptance Criteria

- [ ] Coach can tap "Complete Session" on any past-due booking
- [ ] Attendance marking screen with attended/no-show/late per athlete
- [ ] Quick notes per athlete (effort, focus, one-liner)
- [ ] Badge awarding integrated into completion flow
- [ ] Session transitions: CONFIRMED → AWAITING_COMPLETION → COMPLETED
- [ ] Parent sees "Rate this session" prompt after completion
- [ ] Parent sees attendance + notes on booking detail
- [ ] Coach home shows "sessions to complete" card
- [ ] Flow is fast — coach can complete a 1:1 session in under 30 seconds

## Files Changed

| File | Action |
|------|--------|
| `app/session/[id]/complete.tsx` | CREATE — session completion flow |
| `app/(tabs)/index.tsx` | MODIFY — add "sessions to complete" card (coach) + review prompt (parent) |
| `app/booking/[id].tsx` | MODIFY — show attendance + notes post-completion |
| `services/booking-service.ts` | MODIFY — add status transitions + AWAITING_COMPLETION |
| `constants/app-types.ts` | MODIFY — add AWAITING_COMPLETION to BookingStatus |
| `constants/booking-types.ts` | MODIFY — same |

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
