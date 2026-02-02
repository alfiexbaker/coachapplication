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

## Task 6: RSVP for Group Sessions (Spond-Beater)

**File**: `components/session/rsvp-flow.tsx` + `app/session/[id]/rsvp.tsx`

This is Spond's killer feature — we MUST have it. When a coach creates a group session or match for a squad, all members get an RSVP request.

**Coach creates group session → RSVP sent to squad**:
```
┌─────────────────────────────────────┐
│ U12 Training — Tuesday 6pm         │
│ Hackney Downs Park                  │
│                                     │
│ Is [Jake] coming?                   │
│                                     │
│ [✅ Going]  [❌ Can't]  [❓ Maybe] │
│                                     │
│ Responses close: Mon 6pm            │
└─────────────────────────────────────┘
```

**Coach sees RSVP summary**:
```
┌─────────────────────────────────────┐
│ U12 Training — Tue 6pm             │
│                                     │
│ ✅ 8 Going  ❌ 2 Can't  ❓ 1 Maybe│
│                                     │
│ Going:                              │
│   Jake B. · Emma R. · Tom S. ...   │
│ Can't make it:                      │
│   Oliver P. (away) · Lily W.       │
│ Maybe:                              │
│   Sam K.                            │
│ No response (3):                    │
│   [Send Reminder]                   │
└─────────────────────────────────────┘
```

- RSVP per child (parent responds for their child)
- Coach can send reminder to non-responders (one tap)
- RSVP deadline configurable by coach
- Auto-populate attendance list from RSVPs on session day
- RSVP changes allowed until deadline
- Count shown on session card: "8/12 confirmed"

**Data flow**:
```
Coach creates group session for squad
  → system creates session_rsvp row per squad member (status: 'pending')
  → notification sent to each parent
  → parent responds (going/not_going/maybe)
  → coach sees real-time count
  → on session day, attendance pre-filled from RSVPs
```

## Task 7: Calendar Integration

**File**: `services/calendar-service.ts` + `components/booking/add-to-calendar.tsx`

After booking is confirmed, offer native calendar integration:

```
┌─────────────────────────────────────┐
│ ✅ Booking Confirmed!               │
│                                     │
│ Jake's session with Coach Marcus    │
│ Tue 4 Feb · 4:00pm                 │
│ Hackney Downs Park                  │
│                                     │
│ [📅 Add to Calendar]               │
│ [📍 Get Directions]                │
│ [Done]                              │
└─────────────────────────────────────┘
```

- Uses `expo-calendar` to create native calendar events
- Includes: title, time, location, coach name, notes
- Adds 1h reminder in calendar event
- Works for iOS Calendar + Google Calendar
- Coach can also sync all their sessions to phone calendar (bulk export)

```typescript
import * as Calendar from 'expo-calendar';

async function addBookingToCalendar(booking: Booking): Promise<string> {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  if (status !== 'granted') return;

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const defaultCalendar = calendars.find(c => c.isPrimary) || calendars[0];

  return Calendar.createEventAsync(defaultCalendar.id, {
    title: `Football: ${booking.coachName}`,
    startDate: new Date(booking.scheduledAt),
    endDate: addMinutes(new Date(booking.scheduledAt), booking.duration),
    location: booking.location?.address,
    notes: `Session with Coach ${booking.coachName}\nFocus: ${booking.sessionType}\nPay: £${booking.price} cash`,
    alarms: [{ relativeOffset: -60 }], // 1h before
  });
}
```

## Task 8: Decline Invite with Reason

**File**: `components/booking/decline-invite.tsx`

When parent declines a session invite, offer optional reason:

```
┌─────────────────────────────────────┐
│ Decline this invite?                │
│                                     │
│ Coach Marcus invited Jake to a      │
│ 1:1 session — Tue 4 Feb 4pm        │
│                                     │
│ Reason (optional):                  │
│ ○ Schedule conflict                 │
│ ○ Too far away                      │
│ ○ Price too high                    │
│ ○ Child not available               │
│ ○ Other                             │
│ [Add a note...]                     │
│                                     │
│ [Decline]  [Cancel]                 │
└─────────────────────────────────────┘
```

- Reason sent to coach (helps them adjust)
- Decline reason stored in invite record
- Coach sees decline reason in invite management
- "Suggest another time" option links to counter-offer flow

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
- [ ] RSVP: squad members get RSVP request for group sessions
- [ ] RSVP: parent can respond Going/Can't/Maybe per child
- [ ] RSVP: coach sees real-time count + can remind non-responders
- [ ] RSVP: attendance pre-populated from RSVPs on session day
- [ ] Calendar: "Add to Calendar" creates native event with location + reminder
- [ ] Calendar: coach can bulk-sync sessions to phone calendar
- [ ] Decline: parent can decline invite with optional reason
- [ ] Decline: coach sees decline reason in invite management

## Files Changed

| File | Action |
|------|--------|
| `app/session/[id]/complete.tsx` | ENHANCE (669 lines exist) — add RSVP pre-fill, attendance categories, badge award step |
| `app/session/[id]/rsvp.tsx` | CREATE — RSVP detail + coach summary (NOTE: `app/events/[id]/rsvp.tsx` (588 lines) exists for events — reuse RSVP patterns) |
| `app/(tabs)/index.tsx` | MODIFY — add "sessions to complete" card (coach) + review prompt (parent) |
| `app/booking/[id].tsx` | MODIFY — show attendance + notes post-completion |
| `services/booking-service.ts` | MODIFY — add status transitions + AWAITING_COMPLETION |
| `services/rsvp-service.ts` | CREATE — RSVP CRUD, reminder sending, attendance pre-fill |
| `services/calendar-service.ts` | ENHANCE (437 lines exist) — add booking-to-calendar, coach bulk sync |
| `components/session/rsvp-flow.tsx` | CREATE — parent RSVP UI |
| `components/session/rsvp-summary.tsx` | CREATE — coach RSVP dashboard |
| `components/booking/add-to-calendar.tsx` | CREATE — calendar add button |
| `components/booking/decline-invite.tsx` | CREATE — decline with reason modal |
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

// RSVP
interface SessionRsvp {
  id: string;
  sessionId: string;
  userId: string;
  childId?: string;
  status: 'going' | 'not_going' | 'maybe' | 'pending';
  respondedAt?: string;
}

// Decline reason
interface InviteDeclineReason {
  category: 'schedule_conflict' | 'too_far' | 'price' | 'child_unavailable' | 'other';
  note?: string;
}
```

## DB Tables (add to API_README)

```sql
CREATE TABLE session_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id),
  user_id UUID NOT NULL REFERENCES users(id),
  child_id UUID REFERENCES children(id),
  status VARCHAR(10) NOT NULL DEFAULT 'pending',
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, user_id, child_id)
);

CREATE INDEX idx_rsvps_session ON session_rsvps(session_id);

ALTER TABLE session_invites ADD COLUMN decline_reason VARCHAR(30);
ALTER TABLE session_invites ADD COLUMN decline_note TEXT;
```
