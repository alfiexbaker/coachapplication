# 5B: Onboarding Checklists

**Phase**: 1 — Foundation
**Origin**: Sprint 5, Tasks 3, 4
**Estimated scope**: 2 tasks, guided setup for new users

## Goal

New coaches and parents see a progress checklist guiding them through setup. No one wonders "what do I do next?"

## Tasks

### Task 1: Coach Onboarding Checklist

**File**: `components/coach/onboarding-checklist.tsx`

Shows on coach home until all items are done:

```
┌─────────────────────────────────────┐
│ Get ready to coach                  │
│ ████████░░░░░░░░ 4/8 complete      │
│                                     │
│ ✅ Create your account              │
│ ✅ Add a profile photo              │
│ ✅ Write your bio                   │
│ ✅ Add qualifications               │
│ ○  Set your availability     [→]   │
│ ○  Set scheduling rules      [→]   │
│ ○  Set cancellation policy   [→]   │
│ ○  Go live                   [→]   │
│                                     │
│ [Dismiss checklist]                 │
└─────────────────────────────────────┘
```

Each incomplete item links to the relevant screen. Progress bar fills as items complete. "Dismiss" hides it forever (saves to AsyncStorage).

**Items to check**:
1. Account created (always done)
2. Profile photo set (`avatar` is not null)
3. Bio written (`bio` length > 20)
4. Qualifications added (`certifications.length > 0`)
5. Availability set (at least 1 template exists)
6. Scheduling rules configured (bufferMinutes set — from 3A)
7. Cancellation policy set (at least 1 tier — from 3B)
8. Gone live (`isLive === true`)

### Task 2: Parent Onboarding Checklist

**File**: `components/parent/onboarding-checklist.tsx`

```
┌─────────────────────────────────────┐
│ Get started                         │
│ ██████░░░░░░░░░░ 3/6 complete      │
│                                     │
│ ✅ Create your account              │
│ ✅ Add a child                      │
│ ✅ Add emergency contacts           │
│ ○  Add medical info          [→]   │
│ ○  Set consent preferences   [→]   │
│ ○  Book your first session   [→]   │
│                                     │
│ [Dismiss checklist]                 │
└─────────────────────────────────────┘
```

**Items to check**:
1. Account created
2. At least 1 child added
3. Emergency contacts added for each child
4. Medical info reviewed
5. Consent preferences set (photo, video, etc.)
6. First booking made

## Acceptance Criteria

- [ ] Coach sees onboarding checklist until all 8 items done
- [ ] Parent sees onboarding checklist until all 6 items done
- [ ] Checklists can be dismissed permanently
- [ ] Each item links to the correct setup screen
- [ ] Progress bar updates in real-time

## Files Changed

| File | Action |
|------|--------|
| `components/coach/onboarding-checklist.tsx` | CREATE |
| `components/parent/onboarding-checklist.tsx` | CREATE |
| `app/(tabs)/index.tsx` | MODIFY — add checklists to home screens |

## Dependencies

- **Blocks**: Nothing
- **Blocked by**: 3A, 3B (coach checklist references scheduling rules + cancellation policy)
