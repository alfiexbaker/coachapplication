# 6D: Type Fixes for Bilateral Interactions

**Phase**: 1 — Foundation
**Origin**: Sprint 6, Task 10
**Estimated scope**: 1 task, critical type updates across shared types

## Goal

Fix missing fields in core types that prevent proper two-sided (Action→Reaction) interactions. These are blocking gaps found in the deep code audit.

## Tasks

### Task 1: Type Fixes for Two-Sided Interactions

**File**: `constants/app-types.ts` + `constants/types.ts`

These types are missing fields needed for proper Action→Reaction:

```typescript
// BookingStatus — add manual confirmation state
type BookingStatus = 'PENDING' | 'AWAITING_CONFIRMATION' | 'CONFIRMED' | 'AWAITING_COMPLETION' | 'COMPLETED' | 'CANCELLED';

// Booking — add confirmation tracking
interface Booking {
  // ... existing fields ...
  confirmationMode: 'auto' | 'manual';  // NEW — coach preference
  confirmedAt?: string;                   // NEW — when coach confirmed (manual mode)
  declinedReason?: string;                // NEW — if coach declines booking request
}

// SessionInvite — add decline reason
interface SessionInvite {
  // ... existing fields ...
  declineReason?: 'schedule_conflict' | 'too_far' | 'price' | 'child_unavailable' | 'other';
  declineNote?: string;
}

// Goal — add verification from both sides
interface Goal {
  // ... existing fields ...
  coachVerified?: boolean;       // NEW — coach confirms progress
  coachVerifiedAt?: string;
  parentAcknowledged?: boolean;  // NEW — parent saw the goal
  parentAcknowledgedAt?: string;
}

// WaitlistEntry — add user response when notified
interface WaitlistEntry {
  // ... existing fields ...
  notifiedAt?: string;
  userResponse?: 'accepted' | 'declined' | 'expired';
  userRespondedAt?: string;
  expiresAt?: string;  // 24h to respond before spot goes to next person
}

// ChatMessage — per-recipient read tracking
interface MessageReadReceipt {
  recipientId: string;
  readAt: string;
}

interface ChatMessage {
  // ... existing fields ...
  readReceipts?: MessageReadReceipt[];  // NEW — replaces simple 'read' boolean
}
```

## Acceptance Criteria

- [ ] BookingStatus includes AWAITING_CONFIRMATION for manual confirm
- [ ] Booking has confirmationMode, confirmedAt, declinedReason fields
- [ ] SessionInvite has declineReason + declineNote fields
- [ ] Goal has coachVerified + parentAcknowledged fields
- [ ] WaitlistEntry has user response tracking with 24h expiry
- [ ] ChatMessage uses per-recipient read receipts
- [ ] All existing code using these types still compiles

## Files Changed

| File | Action |
|------|--------|
| `constants/app-types.ts` | MODIFY — add new fields |
| `constants/types.ts` | MODIFY — add new fields |

## Dependencies

- **Blocks**: 7A (booking confirmation uses AWAITING_CONFIRMATION), 2B (decline reason)
- **Blocked by**: Nothing (type changes are standalone)
