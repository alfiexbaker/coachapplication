# Messaging System - Complete Documentation

## Overview

The messaging system enables communication between coaches and parents, with both direct (1-on-1) and group messaging. All messaging is currently booking-scoped for safety.

---

## 1. Screens & Navigation

| Screen | Path | Purpose |
|--------|------|---------|
| Messages Inbox | `/(tabs)/messages` | List of all threads |
| Chat Thread | `/chat/[threadId]` | View/send messages |

---

## 2. Thread Types

### Direct Threads (`kind: 'direct'`)

One-on-one conversations between coach and parent, always linked to a booking.

```typescript
interface DirectThread {
  id: string;
  kind: 'direct';
  bookingId: string;
  coachName: string;
  childName: string;
  serviceName: string;
  location: string;
  scheduledFor: string;
  unreadCount: number;
  lastMessageSnippet?: string;
  lastMessageSender?: string;
  safetyCopy: string;
}
```

### Group Threads (`kind: 'group'`)

Multi-participant conversations for clubs, squads, or classes.

```typescript
interface GroupThread {
  id: string;
  kind: 'group';
  groupType: 'club' | 'squad' | 'class' | 'announcement';
  title: string;
  memberCount: number;
  unreadCount: number;
  unreadMentions?: number;
  scopeLabel: string;           // "Club-wide", "Squad", "Class"
  postingAsOptions: string[];   // ["Myself", "Lions FC"]
  lastMessageSnippet?: string;
  lastMessageSender?: string;
}
```

| Group Type | Example | Scope | Members |
|------------|---------|-------|---------|
| club | "Lions FC Parents" | Club-wide | 48+ |
| squad | "U15 Squad" | Team | 16-18 |
| class | "Saturday Finishing Clinic" | Session | ~24 |

---

## 3. Message Structure

```typescript
interface ChatMessage {
  id: string;                    // "msg_1234567890"
  threadId: string;              // Links to thread
  sender: 'parent' | 'coach';
  senderName?: string;           // "You (posting as Lions FC)"
  body: string;
  createdAt: string;             // ISO timestamp
  status: 'pending' | 'sent' | 'delivered' | 'seen';
  attachments?: ChatAttachment[];
}

interface ChatAttachment {
  id: string;
  type: 'photo' | 'video' | 'pdf';
  title: string;
  subtitle?: string;
  thumbnailUrl?: string;
}
```

### Message Status Flow

```
pending → sent (500ms) → delivered (1000ms) → seen (1500ms)
```

---

## 4. Thread Creation Rules

### Direct Threads

**Created automatically when:**
- Booking is confirmed between coach and parent
- Either party initiates first message

**Access control:**
- Only coach and parent of the booking can participate
- Must have confirmed booking (safety measure)

### Group Threads

**Created by:**
- Club threads: Created with club, owned by COACH/ADMIN
- Squad threads: Created with squad by club admins
- Class threads: Created with clinic by coaches

---

## 5. Posting As (Group Feature)

In group threads, users can post as themselves or on behalf of an entity.

```
"Post as" selector:
├── "Myself" (default)
├── "Lions FC" (if club admin)
└── "Coaching Team" (if coach)
```

When posting as organization:
- Message shows: "You (posting as Lions FC)"
- Appears as official communication
- Available to OWNER, ADMIN, HEAD_COACH roles

---

## 6. Attachments

### Supported Types

| Type | Icon | Extensions |
|------|------|------------|
| photo | image-outline | jpg, png, gif |
| video | videocam-outline | mp4, mov |
| pdf | document-outline | pdf |

### Attachment Picker Features

- Photo library picker
- Camera capture
- Video selection/recording
- Document picker (PDF, DOC)
- Multi-select support
- Thumbnail generation
- MIME type detection

### Current Status: UI Only

Attachment UI is fully implemented but:
- No actual file upload to server
- Stored in message but not persisted
- Mock attachments in sample data

---

## 7. Message Components

### Chat Input (`chat-input.tsx`)

```
┌─────────────────────────────────────────────────┐
│ [📎] Drop a note, media, or PDF... [🎤/➤]      │
└─────────────────────────────────────────────────┘
```

- Attach button (paperclip icon)
- Text input with placeholder
- Send button (arrow) / Voice button (mic when empty)

### Message Composer (`message-composer.tsx`)

Extended composer with:
- Attachment preview row
- Reply preview for quoted messages
- Remove button for each attachment

### Message Bubble (`message-bubble.tsx`)

Displays:
- Sender avatar/initials
- Message text
- Attachment cards (if any)
- Status indicator (sent/delivered/seen)
- Timestamp

---

## 8. Notifications

### New Message Notifications

**For Coach:**
```typescript
notifyCoachNewMessage({
  coachId: string;
  parentName: string;
  threadId: string;
});
// Body: "💬 New message from [parentName]"
// Deep link: /chat/{threadId}
```

**For Parent:**
```typescript
notifyParentNewMessage({
  parentId: string;
  coachName: string;
  threadId: string;
});
// Body: "💬 New message from Coach [coachName]"
// Deep link: /chat/{threadId}
```

---

## 9. Search & Filtering

### Thread Search (Implemented)

Searches across:
- `coachName`
- `title`
- `subtitle`
- `serviceName`

```typescript
const filteredThreads = threads.filter(thread => {
  const haystack = [
    thread.coachName,
    thread.title,
    thread.subtitle,
    thread.serviceName
  ].join(' ').toLowerCase();
  return haystack.includes(searchTerm);
});
```

### Group Thread Filters

- All groups
- Club
- Squad
- Class

### Not Implemented

- Message content search
- Date range filtering
- Advanced search operators

---

## 10. Safety Features

### Safety Banner

Always displayed in thread view:

```
┌─────────────────────────────────────────────────┐
│ 🔒 Stay safe - Messaging unlocks after a        │
│    confirmed booking. Report concerns any time. │
│                                        [Dismiss] │
└─────────────────────────────────────────────────┘
```

### Safety Rules

1. **Booking-scoped messaging** - Can only message within booking context
2. **No direct contact** - Cannot message without prior booking
3. **Report concerns** - Link to report issues available
4. **All conversations monitored** - Stated in safety copy

---

## 11. Mock Data

### Direct Thread Examples

```
conv1: Coach Sarah ↔ Parent1 about Tom Henderson
  - Last: "See you tomorrow at 3." (2 hours ago)
  - Unread: 0

conv2: Coach Mike ↔ Parent1 about Tom Henderson
  - Last: "Tom is making good progress with his finishing."
  - Unread: 1 ⚠️
```

### Group Thread Examples

```
club_announcements: "Lions FC Parents"
  - Type: club
  - Members: 48
  - Unread: 3
  - Mentions: 1
  - Last: "Training moved indoors due to weather."

squad_u15: "U15 Squad"
  - Type: squad
  - Members: 16
  - Unread: 0
  - Last: "Share your availability for Saturday."
```

### Message Examples

```
msg1: parent1 → coach1
  "Hi Sarah, can we book a session for tomorrow at 3pm?"
  Status: seen, 4h ago

msg2: coach1 → parent1
  "Yes that works. Hyde Park as usual?"
  Status: seen, 3h ago

msg_club_1: Director Kelly → club
  "Reminder: indoor training tonight. Bring flats and water."
  Status: seen, 50min ago
```

---

## 12. Implementation Status

### Fully Implemented

- Direct message threads display
- Group message threads (club, squad, class)
- Message bubble UI with sender info
- Unread count badges
- Unread mentions counter
- Message status indicators
- Thread search
- "Post as" selector for groups
- Safety banner
- Message composer
- Attachment picker UI
- Notification creation
- Deep linking

### Placeholder/Partial

- Typing indicator (UI shows, not functional)
- Attachments (UI done, no upload)
- Message actions (delete shows, no logic)
- Quoted replies (composer ready, not wired)

### Not Implemented

- Real typing indicators
- Online status / "last seen"
- Message content search
- Message editing
- Message deletion
- Thread archiving
- User blocking/muting
- Message reactions/emojis
- Voice messages
- Message pinning
- Read receipts per user
- Presence indicators
- Direct messaging outside booking context

---

## 13. Non-Bilateral Issues

### Current Limitations

1. **Booking-scoped only** - Cannot message without booking
2. **No parent-to-parent** - Parents in same club cannot message
3. **No coach-to-coach** - Coaches cannot message each other
4. **No athlete-to-athlete** - No peer messaging

### Proposed Improvements

```typescript
// Add direct messaging capability
interface DirectMessageRequest {
  id: string;
  requesterId: string;
  targetId: string;
  message: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  createdAt: string;
}

// Allow messaging after acceptance
if (directMessageRequest.status === 'ACCEPTED') {
  // Create direct thread without booking requirement
}
```

---

## 14. Storage

**Key:** `'clubroom.messages'`
**Format:** `Record<threadId, ChatMessage[]>`

```typescript
// Example storage structure
{
  "conv1": [
    { id: "msg1", body: "Hi Sarah...", ... },
    { id: "msg2", body: "Yes that works...", ... }
  ],
  "club_announcements": [
    { id: "msg_club_1", body: "Reminder...", ... }
  ]
}
```

---

## 15. Files Reference

### Screens
- `/app/(tabs)/messages.tsx` - Inbox/thread list
- `/app/chat/[threadId].tsx` - Thread view

### Components
- `/components/messaging/message-bubble.tsx`
- `/components/messaging/chat-input.tsx`
- `/components/messaging/message-composer.tsx`
- `/components/messaging/thread-summary.tsx`
- `/components/messaging/typing-indicator.tsx`
- `/components/messaging/attachment-picker.tsx`

### Services
- `/services/messaging-service.ts`
- `/services/notification-service.ts`

### Types
- `/constants/types.ts` - ChatMessage, ChatThreadSummary
- `/constants/app-types.ts` - Conversation, Message

### Mock Data
- `/constants/mock-data.ts` - chatThreads, chatMessages
