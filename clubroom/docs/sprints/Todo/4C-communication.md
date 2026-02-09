# 4C: Squad Chat + Announcements + Bulk Messaging

**Phase**: 2 — Differentiation
**Origin**: Sprint 4, Tasks 7, 8, 9, 10
**Estimated scope**: 4 tasks, Spond-beating communication

## Goal

Every squad has a group chat. Clubs can send announcements and bulk messages. Critical announcements can't be missed. This is the Spond-killer communication layer.

## Tasks

### Task 1: Squad Group Chat

**File**: `app/club/[clubId]/squad/[squadId]/chat.tsx` + `components/club/group-chat.tsx`

```
┌─────────────────────────────────────┐
│ U12 Lions Chat · 14 members        │
│                                     │
│ ┌─ Pinned ──────────────────────┐  │
│ │ Coach Marcus: "Training       │  │
│ │ CANCELLED this Sat due to     │  │
│ │ pitch flooding. Back next wk" │  │
│ └─────────────────────────────────┘ │
│                                     │
│ Sarah M.: "Can someone give Jake   │
│ a lift Tuesday?"                    │
│                                     │
│ Tom R.: "Yeah no problem"          │
│                                     │
│ [camera] Type a message... [Send]  │
└─────────────────────────────────────┘
```

- One group chat per squad (auto-created)
- Coach can pin messages (announcements)
- Photo/image sharing
- Unread badge count on club tab
- Paginated message loading (scroll up)

### Task 2: Club Announcements

**File**: `components/club/feed-cards/announcement-card.tsx`

Club-wide announcements pinned to top of feed:
- Admin-only creation
- RSVP integration (reuses 2C RSVP)
- Push notification to all club members
- Pin/unpin by admin

### Task 3: Bulk Parent Messaging

**File**: `components/club/bulk-message.tsx`

Coach/admin sends to all parents in a squad or whole club:
- Select squad or entire club, or custom pick individuals
- Creates individual message threads (not group — privacy)
- Preview before send
- Delivery confirmation

**Delivery Status (Action→Reaction):**
```
┌─────────────────────────────────────┐
│ Message sent to 14 parents          │
│                                     │
│ ✓✓ Read: 12                        │
│ ✓  Delivered: 2 (not yet opened)   │
│                                     │
│ Sarah M.     ✓✓ Read 2m ago       │
│ Tom R.       ✓✓ Read 5m ago       │
│ Lisa K.      ✓  Delivered          │
└─────────────────────────────────────┘
```
- ✓ = delivered to device, ✓✓ = message opened
- Coach can resend to undelivered after 24h

### Task 4: Critical Announcement Fallback

**Parent Reaction for announcements when push is OFF (Action→Reaction):**
- Critical announcements (cancellations, venue changes, safety) show as **persistent banner** on club screen even if push notifications are disabled
- Banner dismissible only after reading full announcement
- "Training CANCELLED this Saturday" can't be missed

## Action→Reaction: Service Gaps

| Service Function | Actor | Notify Who | Message |
|-----------------|-------|-----------|---------  |
| `club-service.removeMember` | Admin | Removed member | "You've been removed from [club name]" |
| `club-service.undoRemoval` | Admin | Restored member | "You've been re-added to [club name]" |
| `academy-service.removeMember` | Owner | Removed coach | "You've been removed from [academy]" |
| `community-service.inviteToGroup` | Admin | Invited parent | "You've been invited to join [group]" |
| `community-service.promoteMember` | Admin | Promoted member | "You're now an admin of [group]" |
| `community-service.acceptCarpoolRequest` | Driver | Passenger | "Your ride request was accepted!" |
| `community-service.declineCarpoolRequest` | Driver | Passenger | "Ride request declined" |
| `community-service.cancelCarpoolOffer` | Driver | All passengers | "Ride to [event] has been cancelled" |
| `community-service.cancelCarpoolRequest` | Passenger | Driver | "[Name] cancelled their ride request" |

## Acceptance Criteria

- [ ] Every squad has a group chat with pinned messages
- [ ] Photo sharing in group chat
- [ ] Unread badge count on club tab
- [ ] Club announcements pinned to feed with RSVP
- [ ] Bulk messaging to squad or all club parents
- [ ] Delivery status: ✓ delivered, ✓✓ read
- [ ] Critical announcements show persistent banner even if push is off
- [ ] All club/academy/community service notifications wired

## Files Changed

| File | Action |
|------|--------|
| `app/club/[clubId]/squad/[squadId]/chat.tsx` | CREATE |
| `components/club/group-chat.tsx` | CREATE |
| `components/club/feed-cards/announcement-card.tsx` | CREATE |
| `components/club/bulk-message.tsx` | CREATE |
| `services/group-messaging-service.ts` | CREATE |

## Dependencies

- **Blocks**: Nothing
- **Blocked by**: 4A (club infrastructure)
