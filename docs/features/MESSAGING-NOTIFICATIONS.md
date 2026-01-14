# Messaging & Notifications System

> Complete documentation for chat messaging, notifications, and communication features.

---

## Status Notice

| Aspect | Status |
|--------|--------|
| Direct Messaging | **Implemented** (mock data) |
| Group Threads | **Not Implemented** |
| Notifications | **Implemented** (mock data) |
| Preferences | **Implemented** (mock data) |
| Attachments | **UI Only** - no upload |

---

## Overview

The communication system provides:
- Direct messaging between coaches and parents
- Push and in-app notifications
- Notification preferences and quiet hours
- Mute coaches feature

**NOT Currently Implemented:**
- Group threads for clubs/squads (threads are predefined)
- Creating new threads dynamically
- "Post As" organization feature
- Real file attachments

---

## Bilateral Data Flow

### Coach Perspective

```
┌─────────────────────────────────────────────────────────────────┐
│                     COACH DASHBOARD                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   INCOMING                        │   OUTGOING                  │
│   ────────                        │   ────────                  │
│                                   │                             │
│   • Messages from parents         │   • Replies to parents      │
│   • Booking notifications         │   • Session feedback        │
│   • Review notifications          │   • Badge awards            │
│   • Invite responses              │   • Session invites         │
│                                   │                             │
│   NOTIFICATIONS RECEIVED:         │   NOTIFICATIONS SENT:       │
│   ─────────────────────           │   ──────────────────        │
│   • BOOKING_RECEIVED              │   → Parent: BOOKING_CONF    │
│   • MESSAGE_RECEIVED              │   → Parent: MESSAGE_RECV    │
│   • REVIEW_RECEIVED               │   → Parent: BADGE_AWARDED   │
│   • SESSION_INVITE_RESPONSE       │   → Parent: SESSION_INVITE  │
│   • BOOKING_CANCELLED             │   → Parent: SESSION_FEEDBACK│
│                                   │                             │
└─────────────────────────────────────────────────────────────────┘
```

### Parent Perspective

```
┌─────────────────────────────────────────────────────────────────┐
│                     PARENT DASHBOARD                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   INCOMING                        │   OUTGOING                  │
│   ────────                        │   ────────                  │
│                                   │                             │
│   • Messages from coaches         │   • Messages to coaches     │
│   • Booking confirmations         │   • Booking requests        │
│   • Badge notifications           │   • Invite responses        │
│   • Session invites               │   • Reviews                 │
│   • Session feedback              │                             │
│   • Club posts                    │                             │
│                                   │                             │
│   NOTIFICATIONS RECEIVED:         │   ACTIONS THAT NOTIFY COACH:│
│   ─────────────────────           │   ─────────────────────────  │
│   • BOOKING_CONFIRMED             │   → Coach: new booking      │
│   • MESSAGE_RECEIVED              │   → Coach: new message      │
│   • BADGE_AWARDED                 │   → Coach: invite response  │
│   • SESSION_INVITE                │   → Coach: new review       │
│   • SESSION_REMINDER              │   → Coach: booking cancel   │
│                                   │                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Screens & Routes

### Messaging

| Screen | Route | Purpose |
|--------|-------|---------|
| Inbox | `/(tabs)/messages` | All chat threads |
| Chat Thread | `/chat/[threadId]` | Conversation view |

### Notifications

| Screen | Route | Purpose |
|--------|-------|---------|
| Notifications | `/(tabs)/notifications` | All notifications |
| Preferences | `/settings/notifications/preferences` | Configure notifications |

---

## Actual Types (from codebase)

### ChatThreadSummary

From `constants/types.ts` and used by `messaging-service.ts`:

```typescript
interface ChatThreadSummary {
  id: string;

  // Participant info
  coachId: string;
  coachName: string;
  coachPhotoUrl?: string;

  // Booking context
  childName: string;
  serviceName: string;
  location: string;
  scheduledFor: string;

  // Thread state
  unreadCount: number;
  lastMessageSnippet?: string;
  lastMessageSender?: string;
}
```

### ChatMessage

From `constants/types.ts`:

```typescript
interface ChatMessage {
  id: string;
  threadId: string;

  // Sender
  sender: 'parent' | 'coach';
  senderName?: string;

  // Content
  body: string;
  attachments?: any[];

  // Status
  status: 'pending' | 'sent' | 'delivered' | 'seen';

  // Timestamp
  createdAt: string;
}
```

### Message Status Flow

```
pending → sent (500ms) → delivered (1000ms) → seen (1500ms auto)
```

---

## Services

### messaging-service.ts

**Export:** `messagingService` (singleton instance of `MessagingService` class)

**Location:** `/clubroom/services/messaging-service.ts`

```typescript
class MessagingService {
  // Thread Operations
  listThreads(): Promise<ChatThreadSummary[]>
  getThread(threadId: string): Promise<ChatThreadSummary | undefined>

  // Message Operations
  listMessages(threadId: string): Promise<ChatMessage[]>
  sendMessage(
    threadId: string,
    body: string,
    sender: 'parent' | 'coach',
    senderName?: string,
    attachments?: any[]
  ): Promise<ChatMessage>

  // Simulate incoming (for demo)
  simulateIncoming(threadId: string, body: string, senderName?: string): Promise<ChatMessage>

  // Read status
  markThreadRead(threadId: string): Promise<ChatThreadSummary | undefined>

  // Delete
  deleteMessage(threadId: string, messageId: string): Promise<void>
}

export const messagingService = new MessagingService();
```

**Note:** There is NO `createThread()` method. Threads are predefined in mock data.

### notification-service.ts

**Export:** `notificationService` (singleton instance of `NotificationService` class)

**Location:** `/clubroom/services/notification-service.ts`

```typescript
class NotificationService {
  // Core Operations
  list(): Promise<ExtendedNotificationItem[]>
  create(notification: ExtendedNotificationItem): Promise<ExtendedNotificationItem[]>
  markAsRead(id: string): Promise<ExtendedNotificationItem[]>
  markAllAsRead(): Promise<ExtendedNotificationItem[]>
  markHandled(id: string): Promise<ExtendedNotificationItem | undefined>
  clearAll(): Promise<void>
  getUnreadCount(recipientId?: string): Promise<number>
  getByRecipient(recipientId: string): Promise<ExtendedNotificationItem[]>
  getByType(type: NotificationItem['type']): Promise<ExtendedNotificationItem[]>

  // Listener for in-app toasts
  subscribe(listener: NotificationListener): () => void

  // ─────────────────────────────────────────────────────────────
  // COACH NOTIFICATION TRIGGERS
  // ─────────────────────────────────────────────────────────────
  notifyCoachNewBooking(params): Promise<void>
  notifyCoachBookingCancelled(params): Promise<void>
  notifyCoachInviteAccepted(params): Promise<void>
  notifyCoachInviteDeclined(params): Promise<void>
  notifyCoachNewMessage(params): Promise<void>
  notifyCoachNewReview(params): Promise<void>
  notifyCoachSessionReminder(params): Promise<void>

  // ─────────────────────────────────────────────────────────────
  // PARENT NOTIFICATION TRIGGERS
  // ─────────────────────────────────────────────────────────────
  notifyParentBookingConfirmed(params): Promise<void>
  notifyParentSessionInvite(params): Promise<void>
  notifyParentBadgeAwarded(params): Promise<void>
  notifyParentSessionFeedback(params): Promise<void>
  notifyParentNewMessage(params): Promise<void>
  notifyParentSessionReminder(params): Promise<void>
  notifyParentClubPost(params): Promise<void>

  // ─────────────────────────────────────────────────────────────
  // PREFERENCES
  // ─────────────────────────────────────────────────────────────
  getPreferences(userId: string): Promise<EnhancedNotificationPreferences>
  updatePreferences(userId, updates): Promise<EnhancedNotificationPreferences>
  setQuietHours(userId, startTime, endTime, enabled?): Promise<EnhancedNotificationPreferences>
  toggleQuietHours(userId, enabled): Promise<EnhancedNotificationPreferences>
  toggleChannel(userId, channel, enabled): Promise<EnhancedNotificationPreferences>
  toggleNotificationType(userId, type, enabled): Promise<EnhancedNotificationPreferences>
  setNotificationTypeChannels(userId, type, channels): Promise<EnhancedNotificationPreferences>

  // Coach muting
  muteCoach(userId, coachId, coachName, coachAvatar?, reason?): Promise<EnhancedNotificationPreferences>
  unmuteCoach(userId, coachId): Promise<EnhancedNotificationPreferences>
  getMutedCoaches(userId): Promise<MutedCoach[]>
  isCoachMuted(userId, coachId): Promise<boolean>

  // Utility
  isInQuietHours(userId): Promise<boolean>
  shouldSendNotification(userId, type, channel, coachId?): Promise<boolean>
  resetPreferences(userId): Promise<EnhancedNotificationPreferences>
  seedDemoNotifications(): Promise<void>
}
```

---

## Notification Types

### ExtendedNotificationItem

```typescript
interface ExtendedNotificationItem {
  id: string;
  type: 'booking' | 'message' | 'badge' | 'reminder' | 'review';
  notificationType?: NotificationType; // More specific type
  title: string;
  body: string;
  timeLabel: string;
  read: boolean;
  handled?: boolean;

  // Targeting
  recipientId?: string;
  recipientRole?: 'coach' | 'parent';

  // Navigation
  deepLink?: string;
  data?: Record<string, string>;

  // Badge-specific
  badgeTitle?: string;
  athleteName?: string;
  badgeAwardId?: string;
  actionLabel?: string;

  // Timestamps
  createdAt?: string;
  expiresAt?: string;
}
```

### NotificationType (specific types)

```typescript
type NotificationType =
  // Booking-related
  | 'BOOKING_RECEIVED'       // Coach: new booking
  | 'BOOKING_CONFIRMED'      // Parent: booking confirmed
  | 'BOOKING_CANCELLED'      // Coach: booking cancelled

  // Session invites
  | 'SESSION_INVITE'         // Parent: received invite
  | 'SESSION_INVITE_RESPONSE'// Coach: invite accepted/declined

  // Messages
  | 'MESSAGE_RECEIVED'       // Both: new message

  // Badges
  | 'BADGE_AWARDED'          // Parent: child earned badge

  // Reviews
  | 'REVIEW_RECEIVED'        // Coach: new review

  // Reminders
  | 'SESSION_REMINDER';      // Both: upcoming session
```

---

## Notification Preferences

### EnhancedNotificationPreferences

```typescript
interface EnhancedNotificationPreferences {
  userId: string;

  // Channel toggles
  channels: {
    push: boolean;
    email: boolean;
    sms: boolean;
  };

  // Quiet hours
  quietHours: {
    enabled: boolean;
    startTime: string;  // "22:00"
    endTime: string;    // "07:00"
  };

  // Per-type preferences
  typePreferences: Record<NotificationType, {
    enabled: boolean;
    channels: NotificationChannel[];
  }>;

  // Muted coaches
  mutedCoaches: MutedCoach[];

  // Timestamps
  createdAt: string;
  updatedAt: string;
}
```

---

## UI Layouts

### Inbox Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                          Messages                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ [Avatar] Coach Sarah                           2h ago   │  │
│   │          Tom Henderson • 1-on-1 Training               │  │
│   │          "See you tomorrow at 3pm!"           ●        │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ [Avatar] Coach Mike                            1d ago   │  │
│   │          Tom Henderson • Small Group                    │  │
│   │          "Tom is making good progress..."      (1)     │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Chat Thread Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back           Coach Sarah Mitchell                    ⋮     │
│                   Tom • 1-on-1 Training                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   🔒 Stay safe - Messaging unlocks after a confirmed booking.   │
│      Report concerns any time.                      [Dismiss]   │
│                                                                 │
│   ─────────────────────────────────────────────────────         │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │                            Hi Sarah, can we book a      │  │
│   │                            session for tomorrow at 3pm? │  │
│   │                                            4:32 PM  ✓✓  │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ Yes that works! Hyde Park as usual?                     │  │
│   │ 4:35 PM  ✓✓                                             │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│   ─────────────────────────────────────────────────────         │
│                                                                 │
│   [📎] Drop a note, media, or PDF...              [🎤/➤]       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Notifications Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                       Notifications                              │
│                                          [Mark All Read]        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   TODAY                                                         │
│   ─────────────────────────────────────────────────────         │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ 📅 Booking Confirmed                            2h ago  │  │
│   │    Your session with Coach Sarah is confirmed           │  │
│   │    Tuesday, Jan 14 at 3:00 PM                     ●     │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ 🏅 Tom earned a badge!                          5h ago  │  │
│   │    Tom earned the "Best Training" badge from            │  │
│   │    Coach Sarah                        [Share to profile] │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Components

All components verified to exist:

| Component | Path | Purpose |
|-----------|------|---------|
| `message-bubble` | `/components/messaging/message-bubble.tsx` | Message display |
| `chat-input` | `/components/messaging/chat-input.tsx` | Compose input |
| `message-composer` | `/components/messaging/message-composer.tsx` | Extended composer |
| `thread-summary` | `/components/messaging/thread-summary.tsx` | Thread preview |
| `typing-indicator` | `/components/messaging/typing-indicator.tsx` | Typing dots |
| `attachment-picker` | `/components/messaging/attachment-picker.tsx` | File picker |

---

## Storage Keys

| Key | Purpose |
|-----|---------|
| `clubroom.messages` | Message storage by thread |
| `clubroom.notifications` | Notification records |
| `clubroom.notification_preferences` | User preferences by userId |

---

## Current Limitations

1. **No dynamic thread creation** - Threads come from mock data
2. **Booking-scoped only** - Cannot message without pre-existing thread
3. **No parent-to-parent** - Parents cannot message each other
4. **No coach-to-coach** - Coaches cannot message each other
5. **Attachments not uploaded** - UI only, no real storage
6. **No real-time** - No WebSocket for instant updates
7. **No group threads** - Only 1-on-1 direct messages

---

## Files Reference

### Services
- `/clubroom/services/messaging-service.ts`
- `/clubroom/services/notification-service.ts`

### Screens
- `/clubroom/app/(tabs)/messages.tsx`
- `/clubroom/app/chat/[threadId].tsx`
- `/clubroom/app/(tabs)/notifications.tsx`
- `/clubroom/app/settings/notifications/preferences.tsx`

### Components
- `/clubroom/components/messaging/*.tsx`
