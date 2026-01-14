# Messaging & Notifications System

> Complete documentation for chat messaging, notifications, and communication features.

---

## Overview

The communication system provides:
- Direct messaging between coaches and parents
- Group threads for clubs, squads, and classes
- Push and in-app notifications
- Notification preferences and quiet hours
- Safety features for booking-scoped messaging

---

## Feature Summary

| Feature | Status | Description |
|---------|--------|-------------|
| Direct Messages | Complete | 1-on-1 coach-parent chat |
| Group Threads | Complete | Club, squad, class chats |
| Message Composer | Complete | Text, attachments, replies |
| Notifications | Complete | Push and in-app |
| Preferences | Complete | Quiet hours, channel control |
| Attachments | UI Only | No actual upload |

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

## Thread Types

### Direct Threads

1-on-1 conversations between coach and parent, linked to a booking:

```typescript
interface DirectThread {
  id: string;
  kind: 'direct';

  // Participants
  coachId: string;
  coachName: string;
  parentId: string;
  parentName: string;

  // Booking Link
  bookingId: string;
  childName: string;
  serviceName: string;
  location: string;
  scheduledFor: string;

  // State
  unreadCount: number;
  lastMessageSnippet?: string;
  lastMessageSender?: string;
  lastMessageAt?: string;

  // Safety
  safetyCopy: string;
}
```

### Group Threads

Multi-participant conversations:

```typescript
interface GroupThread {
  id: string;
  kind: 'group';

  // Group Info
  groupType: 'club' | 'squad' | 'class' | 'announcement';
  title: string;
  scopeLabel: string;              // "Club-wide", "Squad", "Class"

  // Participants
  memberCount: number;

  // State
  unreadCount: number;
  unreadMentions?: number;
  lastMessageSnippet?: string;
  lastMessageSender?: string;

  // Posting
  postingAsOptions: string[];      // ["Myself", "Lions FC"]
}
```

### Group Types

| Type | Example | Scope | Typical Members |
|------|---------|-------|-----------------|
| `club` | "Lions FC Parents" | Club-wide | 48+ |
| `squad` | "U15 Squad" | Team | 16-18 |
| `class` | "Saturday Clinic" | Session | ~24 |
| `announcement` | "Club Announcements" | Club-wide | All members |

---

## Message Structure

```typescript
interface ChatMessage {
  id: string;
  threadId: string;

  // Sender
  senderId: string;
  senderName: string;
  senderRole: 'parent' | 'coach';
  postingAs?: string;              // "Lions FC" for org posts

  // Content
  body: string;
  attachments?: ChatAttachment[];

  // Status
  status: 'pending' | 'sent' | 'delivered' | 'seen';

  // Reply
  replyTo?: {
    messageId: string;
    preview: string;
  };

  // Timestamps
  createdAt: string;
  seenAt?: string;
}

interface ChatAttachment {
  id: string;
  type: 'photo' | 'video' | 'pdf';
  title: string;
  subtitle?: string;
  thumbnailUrl?: string;
  url?: string;
  size?: number;
}
```

### Message Status Flow

```
pending → sent (500ms) → delivered (1000ms) → seen (on view)
```

---

## Message UI

### Inbox Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                          Messages                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   🔍 [Search conversations...]                                  │
│                                                                 │
│   DIRECT MESSAGES                                               │
│   ─────────────────────────────────────────────────────         │
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
│   GROUP CHATS                                                   │
│   ─────────────────────────────────────────────────────         │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ [Badge] Lions FC Parents              48 members 50m    │  │
│   │         Club-wide                                       │  │
│   │         "Training moved indoors..."            (3) @1   │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ [Badge] U15 Squad                     16 members  3h    │  │
│   │         Squad                                           │  │
│   │         "Share your availability..."                    │  │
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
│   ┌─────────────────────────────────────────────────────────┐  │
│   │                                      Perfect, see you   │  │
│   │                                      tomorrow at 3!     │  │
│   │                                            4:36 PM  ✓✓  │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│   ─────────────────────────────────────────────────────         │
│                                                                 │
│   [📎] Drop a note, media, or PDF...              [🎤/➤]       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## "Post As" Feature

In group threads, users with appropriate roles can post as the organization:

```typescript
// Available options based on role
const postingAsOptions = getUserPostingOptions(userId, groupId);
// Returns: ["Myself", "Lions FC"] for admin
// Returns: ["Myself"] for regular member

// When posting as org
const message = {
  senderId: userId,
  senderName: "You (posting as Lions FC)",
  postingAs: "Lions FC",
  // ...
};
```

Available for: OWNER, ADMIN, HEAD_COACH roles

---

## Attachments

### Supported Types

| Type | Icon | Extensions |
|------|------|------------|
| `photo` | 📷 | jpg, png, gif |
| `video` | 🎬 | mp4, mov |
| `pdf` | 📄 | pdf |

### Attachment Picker

```
┌─────────────────────────────────────────────────────────────────┐
│                      Add Attachment                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│   │     📷      │  │     📹      │  │     📄      │            │
│   │   Photo     │  │   Video     │  │  Document   │            │
│   │   Library   │  │   Camera    │  │   (PDF)     │            │
│   └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                 │
│   ┌─────────────┐                                               │
│   │     📸      │                                               │
│   │   Take      │                                               │
│   │   Photo     │                                               │
│   └─────────────┘                                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Note:** Attachment UI is complete but actual upload is not implemented.

---

## Notifications

### Notification Structure

```typescript
interface AppNotification {
  id: string;
  userId: string;

  // Content
  type: NotificationType;
  title: string;
  body: string;
  timeLabel: string;

  // Status
  read: boolean;
  readAt?: string;

  // Action
  actionType?: string;
  actionData?: Record<string, any>;

  // Timestamps
  createdAt: string;
}

type NotificationType =
  | 'booking'          // Booking updates
  | 'message'          // New messages
  | 'invite'           // Session invites
  | 'badge'            // Badge awarded
  | 'reminder'         // Session reminders
  | 'payment'          // Payment updates
  | 'system';          // System notices
```

### Notification Types

| Type | Icon | Example |
|------|------|---------|
| `booking` | 📅 | "Booking confirmed with Coach Sarah" |
| `message` | 💬 | "New message from Coach Sarah" |
| `invite` | 📩 | "New session invite from Coach Sarah" |
| `badge` | 🏆 | "Tom earned a badge!" |
| `reminder` | ⏰ | "Session with Coach Sarah in 1 hour" |
| `payment` | 💳 | "Payment of £60 processed" |
| `system` | ℹ️ | "App update available" |

### Notification UI

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
│   │ 🏆 Tom earned a badge!                          5h ago  │  │
│   │    Tom earned the "Best Training" badge from            │  │
│   │    Coach Sarah                                    ●     │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│   YESTERDAY                                                     │
│   ─────────────────────────────────────────────────────         │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ 💬 New message                                  1d ago  │  │
│   │    Coach Sarah: "See you tomorrow at 3!"                │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Notification Preferences

### Preference Structure

```typescript
interface NotificationPreferences {
  userId: string;

  // Master Toggle
  pushEnabled: boolean;
  emailEnabled: boolean;

  // By Type
  bookingNotifications: boolean;
  messageNotifications: boolean;
  badgeNotifications: boolean;
  reminderNotifications: boolean;
  marketingNotifications: boolean;

  // Quiet Hours
  quietHoursEnabled: boolean;
  quietHoursStart: string;         // "22:00"
  quietHoursEnd: string;           // "07:00"

  // Email Digest
  emailDigest: 'NONE' | 'DAILY' | 'WEEKLY';
}
```

### Preferences UI

```
┌─────────────────────────────────────────────────────────────────┐
│                  Notification Preferences                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   PUSH NOTIFICATIONS                                            │
│   ─────────────────────────────────────────────────────         │
│                                                                 │
│   [✓] Push notifications enabled                                │
│                                                                 │
│   Booking updates                              [  ON  ]         │
│   New messages                                 [  ON  ]         │
│   Badge awards                                 [  ON  ]         │
│   Session reminders                            [  ON  ]         │
│   Marketing & offers                           [ OFF  ]         │
│                                                                 │
│   QUIET HOURS                                                   │
│   ─────────────────────────────────────────────────────         │
│                                                                 │
│   [✓] Enable quiet hours                                        │
│                                                                 │
│   Start time:  [10:00 PM               ▼]                       │
│   End time:    [7:00 AM                ▼]                       │
│                                                                 │
│   EMAIL NOTIFICATIONS                                           │
│   ─────────────────────────────────────────────────────         │
│                                                                 │
│   [✓] Email notifications enabled                               │
│                                                                 │
│   Email digest: [Weekly summary        ▼]                       │
│                                                                 │
│                       [Save Preferences]                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Safety Features

### Booking-Scoped Messaging

Messaging is only available between parties with a confirmed booking:

```typescript
function canMessage(userId: string, targetId: string): boolean {
  // Check for confirmed booking between users
  const hasBooking = await bookingService.hasConfirmedBooking(userId, targetId);
  return hasBooking;
}
```

### Safety Banner

Always displayed in chat:

```
🔒 Stay safe - Messaging unlocks after a confirmed booking.
   Report concerns any time.                           [Dismiss]
```

### Report Concerns

Link available to report inappropriate behavior.

---

## Services

### messaging-service.ts

```typescript
class MessagingService {
  // Threads
  getThreads(userId: string): Promise<ChatThread[]>
  getThread(threadId: string): Promise<ChatThread>
  createThread(participants: string[], bookingId?: string): Promise<ChatThread>

  // Messages
  getMessages(threadId: string): Promise<ChatMessage[]>
  sendMessage(threadId: string, content: string, attachments?: ChatAttachment[]): Promise<ChatMessage>
  markAsRead(threadId: string): Promise<void>

  // Search
  searchThreads(query: string): Promise<ChatThread[]>
}
```

### notification-service.ts

```typescript
class NotificationService {
  // CRUD
  getNotifications(userId: string): Promise<AppNotification[]>
  createNotification(notification: Omit<AppNotification, 'id'>): Promise<AppNotification>
  markAsRead(notificationId: string): Promise<void>
  markAllAsRead(userId: string): Promise<void>
  deleteNotification(notificationId: string): Promise<void>

  // Preferences
  getPreferences(userId: string): Promise<NotificationPreferences>
  updatePreferences(userId: string, prefs: Partial<NotificationPreferences>): Promise<NotificationPreferences>

  // Push
  registerDevice(userId: string, token: string, platform: string): Promise<void>
  sendPush(userId: string, title: string, body: string, data?: object): Promise<void>

  // Helpers
  notifyBookingConfirmed(booking: Booking): Promise<void>
  notifyNewMessage(threadId: string, senderId: string): Promise<void>
  notifyBadgeAwarded(athleteId: string, badgeAward: BadgeAward): Promise<void>
}
```

---

## Components

### Messaging Components

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
| `clubroom.threads` | Thread metadata |
| `clubroom.notifications` | Notification records |
| `notification_preferences_${userId}` | User preferences |

---

## Current Limitations

1. **Booking-scoped only** - Cannot message without booking
2. **No parent-to-parent** - Parents in same club cannot message
3. **No coach-to-coach** - Coaches cannot message each other
4. **Attachments not uploaded** - UI only, no real storage
5. **No real-time** - No WebSocket for instant updates

---

## Files Reference

### Services
- `/services/messaging-service.ts`
- `/services/notification-service.ts`

### Screens
- `/app/(tabs)/messages.tsx`
- `/app/chat/[threadId].tsx`
- `/app/(tabs)/notifications.tsx`
- `/app/settings/notifications/preferences.tsx`

### Components
- `/components/messaging/*.tsx`
- `/components/notification/*.tsx`
