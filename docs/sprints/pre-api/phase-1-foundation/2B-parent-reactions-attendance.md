# 2B: Parent Reactions + Attendance

**Phase**: 1 — Foundation
**Origin**: Sprint 2, Tasks 4, 5, 8
**Estimated scope**: 3 tasks, parent-side session reactions

## Goal

Parents see what happened after a session: review prompt, attendance display, and decline invites with reason. Every coach action has a parent reaction.

## Tasks

### Task 1: Parent Review Prompt

**File**: `app/(tabs)/index.tsx` (parent view)

When a session is marked COMPLETED, show a card on the parent home:

```
┌─────────────────────────────────────┐
│ How was Jake's session?             │
│ with Coach Marcus — Today 4pm       │
│                                     │
│ ⭐⭐⭐⭐⭐  [Rate Now]  [Later]     │
└─────────────────────────────────────┘
```

Tapping "Rate Now" opens the existing `rate-coach.tsx` flow.
Tapping "Later" dismisses for 24 hours, then re-prompts once.

**Athlete Reaction (Action→Reaction — for teens/adults booking for themselves):**
When session is completed, athlete sees DIFFERENT prompt than parent:
```
┌─────────────────────────────────────┐
│ How was your session?               │
│ with Coach Marcus — Today 4pm       │
│                                     │
│ How do you feel?                    │
│ Great  Good  OK  Tired  Frustrated  │
│                                     │
│ Energy level: ⭐⭐⭐⭐☆             │
│                                     │
│ [Write Journal Entry]  [Rate Coach] │
│ [Later]                             │
└─────────────────────────────────────┘
```
Links to Sprint 9 athlete journal. Dual prompt: journal (personal) + coach review (public).

### Task 2: Attendance Display for Parents

**File**: `app/booking/[id].tsx`

In the booking detail screen, after session is completed, show:

```
Attendance: ✅ Attended
Coach notes: "Great focus on passing today..."
Effort: ⭐⭐⭐⭐ (4/5)
Skills worked: Passing, First Touch
```

### Task 3: Decline Invite with Reason

**File**: `components/booking/decline-invite.tsx`

When parent declines a session invite, offer optional reason:

```
┌─────────────────────────────────────┐
│ Decline this invite?                │
│                                     │
│ Coach Marcus invited Jake to a      │
│ 1:1 session — Tue 4 Feb 4pm        │
│                                     │
│ Reason (optional):                  │
│ ○ Schedule conflict                 │
│ ○ Too far away                      │
│ ○ Price too high                    │
│ ○ Child not available               │
│ ○ Other                             │
│ [Add a note...]                     │
│                                     │
│ [Decline]  [Cancel]                 │
└─────────────────────────────────────┘
```

- Reason sent to coach (helps them adjust)
- Decline reason stored in invite record
- Coach sees decline reason in invite management
- "Suggest another time" option links to counter-offer flow

## New Types

```typescript
// Decline reason
interface InviteDeclineReason {
  category: 'schedule_conflict' | 'too_far' | 'price' | 'child_unavailable' | 'other';
  note?: string;
}
```

## Acceptance Criteria

- [ ] Parent sees "Rate this session" prompt after completion
- [ ] Parent sees attendance + notes on booking detail
- [ ] Athlete sees different post-session prompt (mood + journal)
- [ ] Parent can decline invite with optional reason
- [ ] Coach sees decline reason in invite management
- [ ] Coach sees invite acceptance rate: "8 sent · 5 accepted · 2 declined · 1 pending"

## Files Changed

| File | Action |
|------|--------|
| `app/(tabs)/index.tsx` | MODIFY — add review prompt (parent view) |
| `app/booking/[id].tsx` | MODIFY — show attendance + notes post-completion |
| `components/booking/decline-invite.tsx` | CREATE — decline with reason modal |

## Dependencies

- **Blocks**: Nothing
- **Blocked by**: 2A (needs completed sessions)
