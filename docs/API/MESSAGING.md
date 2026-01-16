# Messaging API

> **Security Level: HIGH**

## Overview

The Messaging API handles direct communication between users. Security focuses on preventing inappropriate contact, protecting minors, and maintaining message privacy.

---

## Security Implementation

### Contact Protection
- **No direct contact sharing** (phone/email) until booking confirmed
- **All communication through platform** initially
- **Block/report functionality** with immediate effect
- **Conversation archival** for dispute resolution

### Minor Protection
- **Parents receive copies** of all messages to children
- **Content filtering** for inappropriate language
- **Adult-child conversations** monitored
- **No direct minor-to-minor messaging** without parent approval

### Message Security
- **End-to-end encryption** for message content
- **Metadata minimization** (no read receipts by default)
- **Auto-deletion options** available
- **No message forwarding** outside platform

---

## Endpoints

### GET /conversations

List user's conversations.

**Security:**
- User sees only their conversations
- Unread counts included
- Last message preview (truncated)

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| type | string | "all", "coaches", "parents" |
| unreadOnly | boolean | Filter to unread |
| limit | number | Max 50, default 20 |
| cursor | string | Pagination cursor |

**Response (200):**
```json
{
  "conversations": [
    {
      "id": "conv_abc123",
      "participant": {
        "id": "usr_coach",
        "name": "Sarah Johnson",
        "avatar": "https://cdn.clubroom.app/avatars/...",
        "type": "COACH",
        "verified": true
      },
      "lastMessage": {
        "preview": "Looking forward to our session...",
        "sentAt": "2026-01-16T10:00:00Z",
        "isOwn": false
      },
      "unreadCount": 2,
      "updatedAt": "2026-01-16T10:00:00Z"
    }
  ],
  "nextCursor": "cursor_xyz",
  "hasMore": true
}
```

---

### GET /conversations/:conversationId

Get conversation with messages.

**Security:**
- Participant only
- Messages paginated
- Blocked users cannot access

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| limit | number | Max 100, default 50 |
| before | string | Messages before this ID |
| after | string | Messages after this ID |

**Response (200):**
```json
{
  "conversation": {
    "id": "conv_abc123",
    "participant": {
      "id": "usr_coach",
      "name": "Sarah Johnson",
      "avatar": "https://cdn.clubroom.app/avatars/...",
      "type": "COACH"
    },
    "context": {
      "hasBookings": true,
      "nextBooking": {
        "id": "bkg_xyz",
        "scheduledAt": "2026-01-20T14:00:00Z"
      }
    },
    "messages": [
      {
        "id": "msg_001",
        "content": "Hi! I'd like to discuss Tom's progress.",
        "senderId": "usr_parent",
        "sentAt": "2026-01-15T14:00:00Z",
        "status": "DELIVERED"
      },
      {
        "id": "msg_002",
        "content": "Of course! He's doing great with his backhand.",
        "senderId": "usr_coach",
        "sentAt": "2026-01-15T14:05:00Z",
        "status": "READ"
      }
    ],
    "hasMore": true,
    "nextCursor": "cursor_abc"
  }
}
```

---

### POST /conversations

Start a new conversation.

**Security:**
- Cannot message blocked users
- Cannot message without relationship (booking/roster)
- Rate limited to prevent spam
- Initial message required

**Request:**
```json
{
  "participantId": "usr_coach",
  "message": {
    "content": "Hi Sarah! I wanted to ask about Tom's next session."
  }
}
```

**Response (201):**
```json
{
  "conversation": {
    "id": "conv_new123",
    "participant": {
      "id": "usr_coach",
      "name": "Sarah Johnson"
    },
    "createdAt": "2026-01-16T10:00:00Z"
  },
  "message": {
    "id": "msg_001",
    "content": "Hi Sarah! I wanted to ask about Tom's next session.",
    "sentAt": "2026-01-16T10:00:00Z",
    "status": "SENT"
  }
}
```

---

### POST /conversations/:conversationId/messages

Send a message.

**Security:**
- Participant only
- Content sanitization
- Attachment validation
- Rate limited (30/minute)

**Request:**
```json
{
  "content": "Thanks for the update!",
  "attachments": [
    {
      "type": "image",
      "uploadId": "upload_abc123"
    }
  ]
}
```

**Response (201):**
```json
{
  "message": {
    "id": "msg_003",
    "content": "Thanks for the update!",
    "senderId": "usr_parent",
    "sentAt": "2026-01-16T10:10:00Z",
    "status": "SENT",
    "attachments": [
      {
        "id": "att_001",
        "type": "image",
        "url": "https://cdn.clubroom.app/messages/...",
        "thumbnailUrl": "https://cdn.clubroom.app/messages/.../thumb"
      }
    ]
  }
}
```

**Attachment Rules:**
| Type | Max Size | Formats |
|------|----------|---------|
| Image | 10 MB | JPEG, PNG, HEIC |
| Document | 25 MB | PDF |
| No video in messages | - | Use video service |

---

### POST /conversations/:conversationId/read

Mark messages as read.

**Security:**
- Participant only
- Updates read status

**Request:**
```json
{
  "upToMessageId": "msg_003"
}
```

**Response (200):**
```json
{
  "markedRead": 3,
  "unreadCount": 0
}
```

---

### DELETE /conversations/:conversationId/messages/:messageId

Delete a message (for self).

**Security:**
- Sender only
- Within 24 hours of sending
- Message hidden, not deleted (audit)

**Response (200):**
```json
{
  "message": {
    "id": "msg_003",
    "deleted": true,
    "deletedAt": "2026-01-16T10:15:00Z"
  }
}
```

---

### POST /users/:userId/block

Block a user.

**Security:**
- Immediate effect
- Conversations hidden
- Cannot message each other
- Does not notify blocked user

**Request:**
```json
{
  "reason": "Inappropriate messages"
}
```

**Response (200):**
```json
{
  "blocked": {
    "userId": "usr_xyz",
    "blockedAt": "2026-01-16T10:00:00Z"
  }
}
```

---

### DELETE /users/:userId/block

Unblock a user.

**Security:**
- Restores conversation access
- Does not notify user

**Response (204):**
No content.

---

### POST /messages/:messageId/report

Report a message.

**Security:**
- Triggers moderation review
- Reporter identity protected
- Message preserved for review

**Request:**
```json
{
  "reason": "INAPPROPRIATE_CONTENT",
  "details": "Message contained offensive language"
}
```

**Response (200):**
```json
{
  "report": {
    "id": "rpt_abc123",
    "status": "PENDING_REVIEW",
    "createdAt": "2026-01-16T10:00:00Z"
  }
}
```

**Report Reasons:**
| Reason | Description |
|--------|-------------|
| INAPPROPRIATE_CONTENT | Offensive/adult content |
| HARASSMENT | Bullying or harassment |
| SPAM | Unsolicited advertising |
| SCAM | Fraudulent activity |
| SAFETY_CONCERN | Threat or safety issue |
| OTHER | Other concern |

---

## Real-Time (WebSocket)

### Connection

```javascript
const ws = new WebSocket('wss://api.clubroom.app/ws?token=<access_token>');
```

### Events

**Receiving Messages:**
```json
{
  "event": "message:received",
  "data": {
    "conversationId": "conv_abc123",
    "message": {
      "id": "msg_004",
      "content": "New message content",
      "senderId": "usr_coach",
      "sentAt": "2026-01-16T10:20:00Z"
    }
  }
}
```

**Typing Indicator:**
```json
{
  "event": "typing:started",
  "data": {
    "conversationId": "conv_abc123",
    "userId": "usr_coach"
  }
}
```

**Message Status:**
```json
{
  "event": "message:delivered",
  "data": {
    "messageId": "msg_003",
    "deliveredAt": "2026-01-16T10:20:01Z"
  }
}
```

---

## Content Moderation

### Automated Filtering
- Profanity filter (configurable strictness)
- Link scanning for malicious URLs
- Phone/email detection (masked until appropriate)
- Image scanning for inappropriate content

### Human Review Triggers
- Multiple reports on same user
- Keywords flagged by filter
- Messages to/from minors flagged
- High-volume messaging patterns

---

## Data Protection

### Message Storage
| Data | Encryption | Retention |
|------|------------|-----------|
| Message content | E2E encrypted | Until deleted |
| Attachments | At rest (AES-256) | 90 days after conversation ends |
| Metadata | At rest | 2 years |
| Deleted messages | Soft delete | 30 days, then purged |

### What We Can Access
- Message metadata (timestamps, participants)
- Reported messages (for moderation)
- Blocked user relationships

### What We Cannot Access
- Encrypted message content (without report)
- Message read status (optional feature)

---

## Error Codes

| Code | Description |
|------|-------------|
| MSG_001 | Conversation not found |
| MSG_002 | Cannot message user (blocked) |
| MSG_003 | Cannot message user (no relationship) |
| MSG_004 | Message too long |
| MSG_005 | Attachment too large |
| MSG_006 | Invalid attachment type |
| MSG_007 | Rate limit exceeded |
| MSG_008 | Cannot delete (time limit) |
