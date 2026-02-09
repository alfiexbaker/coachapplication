# 2C: Group RSVP + Calendar Integration

**Phase**: 1 — Foundation
**Origin**: Sprint 2, Tasks 6, 7
**Estimated scope**: 2 tasks, Spond-beating RSVP + native calendar

## Goal

Group sessions have RSVP (the killer Spond feature). Bookings can be added to phone calendar. These two features alone justify switching from Spond.

## Tasks

### Task 1: RSVP for Group Sessions

**File**: `components/session/rsvp-flow.tsx` + `app/session/[id]/rsvp.tsx`

When a coach creates a group session or match for a squad, all members get an RSVP request.

**Parent sees:**
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

**Coach sees RSVP summary:**
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

**Data flow:**
```
Coach creates group session for squad
  → system creates session_rsvp row per squad member (status: 'pending')
  → notification sent to each parent
  → parent responds (going/not_going/maybe)
  → coach sees real-time count
  → on session day, attendance pre-filled from RSVPs
```

**Action→Reaction notifications:**

| Service Function | Actor | Notify Who | Message |
|-----------------|-------|-----------|---------  |
| `group-session-service.register` | Parent | Coach | "[Athlete] registered for [session]" |
| `group-session-service.cancelRegistration` | Parent | Coach | "[Athlete] dropped out of [session]" |
| `group-session-service.createSession` | Coach | Squad parents | "New group session: [date] at [location]" |
| `group-session-service.cancelSession` | Coach | All registered parents | "[Session] has been cancelled" |
| `event-service.createEvent` | Coach | Club members | "New event: [name] on [date]" |
| `event-service.cancelEvent` | Coach | All RSVPed users | "[Event] has been cancelled" |
| `event-service.rsvp` | Parent | Event organiser (coach) | "[Name] is going / can't make it" |
| `event-service.checkIn` | Coach | Parent | "Jake has been checked in to [event]" |

### Task 2: Calendar Integration

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

## New Types

```typescript
interface SessionRsvp {
  id: string;
  sessionId: string;
  userId: string;
  childId?: string;
  status: 'going' | 'not_going' | 'maybe' | 'pending';
  respondedAt?: string;
}
```

## DB Tables

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
```

## Acceptance Criteria

- [ ] RSVP: squad members get RSVP request for group sessions
- [ ] RSVP: parent can respond Going/Can't/Maybe per child
- [ ] RSVP: coach sees real-time count + can remind non-responders
- [ ] RSVP: attendance pre-populated from RSVPs on session day
- [ ] Calendar: "Add to Calendar" creates native event with location + reminder
- [ ] Calendar: coach can bulk-sync sessions to phone calendar

## Files Changed

| File | Action |
|------|--------|
| `app/session/[id]/rsvp.tsx` | CREATE |
| `components/session/rsvp-flow.tsx` | CREATE |
| `components/session/rsvp-summary.tsx` | CREATE |
| `components/booking/add-to-calendar.tsx` | CREATE |
| `services/rsvp-service.ts` | CREATE |
| `services/calendar-service.ts` | ENHANCE (437 lines exist) |

## Dependencies

- **Blocks**: Nothing
- **Blocked by**: 1A (api-client)
