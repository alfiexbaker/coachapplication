# 10C: Smart Notifications + Reminders

**Phase**: 3 — Competitive Edge
**Origin**: Sprint 10, Tasks 4, 5, 8
**Estimated scope**: 3 tasks, one-tap actions + location-aware reminders

## Goal

One-tap actions from notifications. Smart session reminders with location and equipment. Parents respond to invites without opening the app.

## Tasks

### Task 1: One-Tap Actions

**File**: Various — notification handlers + quick action components

Match invite response from notification:
```
┌─ Push Notification ─────────────────┐
│ U12s vs Arsenal — Sat 8 Feb 10am   │
│ Is Jake available?                   │
│                                     │
│ [✅ Available] [❌ Unavailable]     │
└─────────────────────────────────────┘
```

Session invite from notification:
```
┌─ Push Notification ─────────────────┐
│ Coach Marcus invited Jake to a      │
│ session — Tue 4 Feb 4pm             │
│                                     │
│ [✅ Accept] [View Details]          │
└─────────────────────────────────────┘
```

Parent taps directly from notification — ONE TAP, no app navigation needed.

### Task 2: Smart Session Reminders

**File**: `services/reminder-service.ts`

**24h reminder:**
```
┌─ Push Notification ─────────────────┐
│ Tomorrow: Jake's session with       │
│ Coach Marcus                         │
│ 4:00pm · Hackney Downs Park        │
│ Focus: Passing & Movement           │
│                                     │
│ [Get Directions] [View Details]    │
└─────────────────────────────────────┘
```

**1h reminder:**
```
┌─ Push Notification ─────────────────┐
│ In 1 hour: Jake's session           │
│ Hackney Downs Park                  │
│ Don't forget: shin pads, water     │
│                                     │
│ [Get Directions]                    │
└─────────────────────────────────────┘
```

- Location-aware: "Get Directions" opens native Maps
- Equipment reminder from session plan (if set)
- Scheduled via `expo-notifications` when booking confirmed
- Cancelled if booking cancelled

```typescript
async function scheduleSessionReminders(booking: Booking) {
  const sessionDate = new Date(booking.scheduledAt);
  const id24h = await scheduleLocalNotification({
    title: `Tomorrow: ${booking.athleteName}'s session`,
    body: `${formatTime(sessionDate)} · ${booking.location?.name}`,
    data: { deepLink: `clubroom://booking/${booking.id}` },
    trigger: { date: subHours(sessionDate, 24) },
  });
  const id1h = await scheduleLocalNotification({
    title: `In 1 hour: ${booking.athleteName}'s session`,
    body: `${booking.location?.name}`,
    data: { deepLink: `clubroom://booking/${booking.id}`, showDirections: true },
    trigger: { date: subHours(sessionDate, 1) },
  });
  await storeReminderIds(booking.id, [id24h, id1h]);
}
```

### Task 3: Pre-Session Reminders with Directions

Extension of Task 2:
- "Get Directions" link opens native Maps with venue coordinates
- Equipment reminder if coach listed equipment in session plan
- Reminders cancelled if booking cancelled (cancel stored notification IDs)

## Acceptance Criteria

- [ ] Match invite: one-tap "Available/Unavailable" from notification
- [ ] Session invite: one-tap "Accept" from notification
- [ ] 24h session reminder with location + directions link
- [ ] 1h session reminder with equipment + directions
- [ ] "Get Directions" opens native Maps app
- [ ] Reminders cancelled if booking cancelled

## Files Changed

| File | Action |
|------|--------|
| `services/reminder-service.ts` | CREATE |
| Various notification handlers | MODIFY — add one-tap actions |

## Dependencies

- **Blocks**: Nothing
- **Blocked by**: 6C (notification infrastructure)
