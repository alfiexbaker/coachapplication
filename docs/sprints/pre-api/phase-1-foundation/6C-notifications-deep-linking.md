# 6C: Notifications + Deep Linking

**Phase**: 1 — Foundation
**Origin**: Sprint 6, Tasks 7, 8, 9
**Estimated scope**: 3 tasks, push infrastructure + notification centre + deep links

## Goal

Push notification pipeline (mock for now, real push later). In-app notification centre with bell icon. Deep links for all shareable/notifiable content.

## Tasks

### Task 1: Push Notification Infrastructure

**File**: `services/push-notification-service.ts` + `hooks/usePushNotifications.ts`

Set up the notification pipeline:

```typescript
import * as Notifications from 'expo-notifications';

// Register for push notifications
async function registerForPushNotifications(): Promise<string | null> {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return null;
  const token = (await Notifications.getExpoPushTokenAsync()).data;
  await apiClient.set('push_token', token);
  return token;
}

// Schedule local notification (works without server)
async function scheduleLocalNotification(params: {
  title: string;
  body: string;
  data?: Record<string, any>;
  trigger: Notifications.NotificationTriggerInput;
}): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    content: { title: params.title, body: params.body, data: params.data },
    trigger: params.trigger,
  });
}
```

**All 44 notification types** (local for MVP, server-push ready):

| Type | Trigger | Example |
|------|---------|---------|
| `booking_confirmed` | Booking created | "Booking confirmed: Tue 4pm with Coach Marcus" |
| `booking_cancelled` | Booking cancelled | "Coach Marcus cancelled your session" |
| `invite_received` | Invite created | "Coach Marcus invited Jake to a session" |
| `rsvp_request` | Group session created | "U12 Training Tue 6pm — is Jake coming?" |
| `session_reminder_24h` | 24h before session | "Tomorrow: Jake's session at 4pm" |
| `session_reminder_1h` | 1h before session | "In 1 hour: session at Hackney Downs" |
| `review_prompt` | Session completed | "How was Jake's session?" |
| `new_review` | Review submitted | "New 5-star review from Sarah M." |
| `new_message` | Message received | "Sarah M.: Can we reschedule?" |
| `badge_earned` | Badge awarded | "Jake earned First Touch Master!" |
| `milestone` | Milestone reached | "You've completed 50 sessions!" |
| `video_shared` | Coach shares video | "Coach Marcus shared a video from Jake's session" |
| `drill_completed` | Athlete completes drill | "Jake completed Cone Weave Dribbling" |
| `roster_added` | Coach adds athlete | "Jake has been added to Coach Marcus's roster" |
| `no_show_marked` | Coach marks no-show | "Jake was marked as no-show" |
| `booking_request` | Parent books (manual confirm) | "New booking request from Sarah M." |
| `reschedule_request` | Coach proposes reschedule | "Coach Marcus wants to move your session" |
| `price_change` | Coach updates rate | "Rate updated. Existing bookings unaffected." |
| `slot_freed` | Booking cancelled, waitlist | "A spot opened up for Tue 4pm" |
| `review_reply` | Coach replies to review | "Coach Marcus replied to your review" |
| `coach_on_way` | Coach taps "on my way" | "Coach Marcus is on the way!" |
| `goal_completed` | Goal marked complete | "Jake completed: Master keepy-ups!" |
| `goal_created` | Coach creates goal | "New goal: [name]" |
| `goal_progress` | Coach updates progress | "Goal [name] now at [x]%" |
| `milestone_completed` | Milestone done | "Milestone done: [name]" |
| `announcement_critical` | Admin posts critical | "Training CANCELLED this Saturday" |
| `group_session_created` | Coach creates group | "New: U12 Training Tue 6pm" |
| `group_session_cancelled` | Coach cancels group | "U12 Training cancelled" |
| `registration_received` | Parent registers | "[Athlete] registered" |
| `registration_cancelled` | Parent drops out | "[Athlete] dropped out" |
| `event_created` | Coach creates event | "New event: [name]" |
| `event_cancelled` | Coach cancels event | "[Event] cancelled" |
| `event_rsvp` | Parent RSVPs | "[Name] is going" |
| `event_checkin` | Coach checks in | "Jake checked in" |
| `member_removed` | Admin removes member | "You've been removed from [club]" |
| `member_promoted` | Admin promotes | "You're now admin of [group]" |
| `carpool_accepted` | Driver accepts | "Ride confirmed!" |
| `carpool_cancelled` | Driver cancels | "Ride cancelled" |
| `guardian_invited` | Parent invites guardian | "Family invite from [name]" |
| `guardian_removed` | Parent removes guardian | "Removed from family" |
| `drill_assigned` | Coach assigns drill | "Coach assigned: [drill name]" |
| `club_removed` | Admin removes member | "Removed from [club]" |
| `club_restored` | Admin restores member | "Re-added to [club]" |
| `permissions_updated` | Admin changes perms | "Your permissions were updated" |

**Permission flow**: Ask during onboarding (Sprint 10), not on first app open.

### Task 2: In-App Notification Centre

**File**: `app/notifications.tsx` + `components/ui/notification-bell.tsx`

Bell icon in header with badge count:

```
┌─────────────────────────────────────┐
│ Notifications                       │
│                                     │
│ Today                               │
│ ┌──────────────────────────────┐   │
│ │ Booking confirmed            │   │
│ │ Tue 4pm with Coach Marcus    │   │
│ │ 2 hours ago                  │   │
│ └──────────────────────────────┘   │
│ ┌──────────────────────────────┐   │
│ │ Badge earned!                │   │
│ │ Jake earned "Passing Pro"    │   │
│ │ 3 hours ago                  │   │
│ └──────────────────────────────┘   │
│                                     │
│ Yesterday                           │
│ ┌──────────────────────────────┐   │
│ │ New review                   │   │
│ │ Sarah M. gave you 5 stars   │   │
│ │ 1 day ago                    │   │
│ └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

- Grouped by day
- Tap notification → navigate to relevant screen (deep link)
- Mark as read on tap
- "Mark all as read" action
- Badge count on bell icon (unread count)
- Stored locally for MVP (api-client), server-synced later

### Task 3: Deep Linking

**File**: `app/_layout.tsx` + `app.json` (linking config)

Set up Expo Router deep links for all shareable/notifiable content:

| Link | Screen |
|------|--------|
| `clubroom://booking/:id` | Booking detail |
| `clubroom://coach/:id` | Coach profile |
| `clubroom://coach/:slug/public` | Public coach profile |
| `clubroom://invite/:id` | Invite acceptance |
| `clubroom://club/join/:code` | Club join flow |
| `clubroom://session/:id/rsvp` | Session RSVP |
| `clubroom://notifications` | Notification centre |
| `clubroom://challenge/:id` | Video challenge |

```typescript
// In notification handler
Notifications.addNotificationResponseReceivedListener(response => {
  const data = response.notification.request.content.data;
  if (data.deepLink) {
    router.push(data.deepLink);
  }
});
```

## Acceptance Criteria

- [ ] Push notification permission request flow
- [ ] Local notifications work for all 44 notification types
- [ ] In-app notification centre with bell icon + badge count
- [ ] Tap notification → navigate to relevant screen
- [ ] Notification preferences saved (per-type toggles from 5D)
- [ ] Deep links work for all shareable/notifiable content
- [ ] Notification tap opens correct screen via deep link

## Files Changed

| File | Action |
|------|--------|
| `services/push-notification-service.ts` | CREATE |
| `hooks/usePushNotifications.ts` | CREATE |
| `app/(tabs)/notifications.tsx` | ENHANCE (378 lines exist) |
| `components/ui/notification-bell.tsx` | CREATE |
| `constants/notification-types.ts` | CREATE |
| `app/_layout.tsx` | MODIFY — add deep link handling + notification listener |

## Dependencies

- **Blocks**: 10C (smart reminders use notification infra)
- **Blocked by**: 1A (api-client)
