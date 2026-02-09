# 3B: Cancellation + No-Show Handling

**Phase**: 1 — Foundation
**Origin**: Sprint 3, Tasks 3, 4, 7, 8
**Estimated scope**: 4 tasks, full cancellation lifecycle

## Goal

Cancellation policy is visible before booking. Both coach and parent can cancel with proper flow. No-shows are tracked. Every cancellation triggers the right reaction on the other side.

## Tasks

### Task 1: Cancellation Policy Editor

**File**: `components/coach/cancellation-policy-editor.tsx`

**Default policies** (pick one or customise):

| Policy | 24h+ | 12-24h | <12h |
|--------|------|--------|------|
| Flexible | Full refund | Full refund | 50% refund |
| Standard | Full refund | 50% refund | No refund |
| Strict | Full refund | No refund | No refund |
| Custom | Edit tiers... | | |

For MVP with cash-only payments, this is about setting expectations, not processing refunds.

### Task 2: Display Policy on Booking Confirmation

**File**: `app/book-coach.tsx` (Step 4 — confirm) and `app/confirm-booking.tsx`

Before parent confirms, show:

```
┌─ Cancellation Policy ──────────────┐
│ Standard Policy                     │
│                                     │
│ • 24h+ before: Full refund         │
│ • 12-24h before: 50% refund        │
│ • Less than 12h: No refund         │
│                                     │
│ By booking, you agree to this       │
│ cancellation policy.                │
└─────────────────────────────────────┘
```

### Task 3: Full Cancellation Flow (End-to-End)

**File**: `app/booking/[id]/cancel.tsx` + `components/booking/cancel-flow.tsx`

**Parent cancels a session:**
```
┌─────────────────────────────────────┐
│ Cancel this session?                │
│                                     │
│ 1:1 with Coach Marcus               │
│ Tue 4 Feb · 4:00pm                 │
│                                     │
│ ⚠️ Cancellation Policy              │
│ You're cancelling less than 24h     │
│ before. Coach's policy:             │
│ "Less than 24h: Full fee may apply" │
│                                     │
│ Reason (optional):                  │
│ ○ Child is ill                      │
│ ○ Schedule change                   │
│ ○ Other: [________]                 │
│                                     │
│ [Confirm Cancel]  [Keep Session]    │
└─────────────────────────────────────┘
```

- Policy tier shown based on time-to-session
- Coach notified immediately
- Slot freed in availability
- Booking → `CANCELLED` with `cancelledBy`, `cancelReason`, `cancelledAt`
- "Would you like to reschedule?" CTA

**Coach Reaction when parent cancels (Action→Reaction):**
- Coach gets notification: "Sarah M. cancelled Jake's session (Tue 4pm). Reason: child is ill."
- Coach schedule shows freed slot highlighted: "Slot opened up — Tue 4:00pm"
- If waitlist has entries: "1 person on waitlist for this slot. [Offer to Waitlist]"
- One-tap offer sends notification to waitlisted parent: "A spot opened up for Tue 4pm with Coach Marcus. [Book Now]"

**Coach cancels a session:**
- Parent notified with "Book another time?" CTA
- "Suggest alternative" links to counter-offer flow
- Reason required (unable to attend / weather / venue / emergency / other)

**Coach reschedules a session (Action→Reaction):**
- Coach proposes new date/time from booking detail
- Parent receives notification: "Coach Marcus wants to move Jake's session"
- Parent sees reschedule request screen:
```
┌─────────────────────────────────────┐
│ Reschedule Request                  │
│                                     │
│ Coach Marcus wants to move:         │
│ Original: Tue 4 Feb · 4:00pm      │
│ Proposed: Wed 5 Feb · 5:00pm      │
│ Same location: Hackney Downs       │
│                                     │
│ Reason: "Venue double-booked"      │
│                                     │
│ [Accept New Time]                   │
│ [Suggest Different Time]            │
│ [Cancel Booking]                    │
└─────────────────────────────────────┘
```
- NOT auto-accepted — parent must confirm
- "Suggest Different Time" opens counter-offer flow

### Task 4: No-Show Handling

Added to session completion flow (2A). When coach marks NO_SHOW:
- Categorise: no-show / late cancel / excused
- Show policy reminder to coach
- Option to send automated message to parent about policy
- Track no-show count per family (3+ triggers warning for coach)

**Parent Reaction (Action→Reaction):**
- Parent receives notification: "Jake was marked as no-show for today's session."
- If policy applies: "Coach's cancellation policy: full session fee may still apply."
- Parent can dispute: "This isn't right" → opens message thread with coach
- In booking detail, no-show status visible with reason
- If 3+ no-shows: parent sees "You have 3 missed sessions."

## New Types

```typescript
interface CancellationRecord {
  bookingId: string;
  cancelledBy: string; // userId
  cancelledAt: string;
  reason?: 'child_ill' | 'schedule_change' | 'weather' | 'venue' | 'emergency' | 'other';
  note?: string;
  policyTierApplied?: string;
}
```

## Acceptance Criteria

- [ ] Coach can pick a default policy or create custom cancellation tiers
- [ ] Cancellation policy displays on booking confirmation screen
- [ ] Parent can cancel with reason, sees policy tier, coach notified
- [ ] Coach can cancel with reason, parent notified with rebooking CTA
- [ ] Cancelled slot freed in availability
- [ ] Waitlist offered freed slot if applicable
- [ ] No-show categorisation (no-show / late cancel / excused)
- [ ] No-show tracking per family (3+ warning)
- [ ] Reschedule requires parent confirmation (not auto-accepted)

## Files Changed

| File | Action |
|------|--------|
| `components/coach/cancellation-policy-editor.tsx` | CREATE |
| `components/booking/cancel-flow.tsx` | CREATE |
| `app/booking/[id]/cancel.tsx` | ENHANCE (544 lines exist) |
| `app/book-coach.tsx` | MODIFY — show policy |
| `app/confirm-booking.tsx` | MODIFY — show policy |
| `services/cancellation-service.ts` | CREATE |

## Dependencies

- **Blocks**: Nothing
- **Blocked by**: 3A (needs settings hub)
