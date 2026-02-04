# 10D: Micro-Interactions + Empty States + Coach Status

**Phase**: 3 — Competitive Edge
**Origin**: Sprint 10, Tasks 6, 7, 9
**Estimated scope**: 3 tasks, the finishing touches

## Goal

The app feels premium with subtle micro-interactions. Empty states guide users. Coach "I'm on my way" status closes the last communication gap.

## Tasks

### Task 1: Micro-Interactions & Polish

**File**: Various UI components

Small touches that make the app feel premium:

| Interaction | Animation |
|-------------|-----------|
| Pull-to-refresh | Bouncy football icon |
| Tab switch | Smooth cross-fade (not hard cut) |
| Card tap | Subtle scale down (0.98) on press |
| Toggle switch | Haptic feedback |
| Favourite coach | Heart fills with colour + scale pop |
| Send message | Swoosh sound + message slides up |
| Complete drill | Checkmark draws itself |
| Badge award | Badge spins in from top |
| Booking confirmed | Green checkmark pulse |
| Session complete | Card sweeps away with satisfaction |
| Skill level up | Number counts up with glow |
| Star rating | Stars fill left-to-right with delay |

Keep these SUBTLE. No over-the-top animation. Just enough to feel responsive and alive.

### Task 2: Empty States That Educate

Every empty state should tell the user what to do next:

| Screen | Empty State |
|--------|------------|
| Bookings (parent) | "No sessions booked yet. Find a coach and book your first session." [Find Coaches] |
| Roster (coach) | "Your roster is empty. Athletes appear here after their first session with you." |
| Badges (athlete) | "No badges yet. Keep training — your coach will award badges as you improve!" |
| Messages | "No conversations yet. Messages with coaches appear here after booking." |
| Videos | "No videos yet. Your coach will share session clips here." |
| Goals | "No goals set. Work with your coach to set your first training goal." [Set a Goal] |
| Club feed | "It's quiet here. Be the first to post!" [Create Post] |

Use simple, football-themed illustrations. Not generic stock art.

### Task 3: Coach "I'm On My Way" Status

**File**: `components/session/coach-status.tsx`

On coach dashboard, day-of sessions show one-tap status toggle:
```
│ 4:00pm  Jake B.                    │
│    Hackney Downs Park               │
│    [I'm On My Way →]                │
```

Tap → parent gets notification: "Coach Marcus is on the way! Session at 4:00pm at Hackney Downs Park"
- Green "Coach is on the way" badge on booking detail for parent
- Auto-resets after session time

## Acceptance Criteria

- [ ] All micro-interactions implemented (press states, transitions, haptics)
- [ ] All empty states have contextual message + CTA
- [ ] Coach "I'm On My Way" toggle → parent notified + green badge
- [ ] Haptic feedback on toggle switches
- [ ] Animations respect system "Reduce Motion" setting

## Files Changed

| File | Action |
|------|--------|
| All UI components | MODIFY — add micro-interactions |
| All list screens | MODIFY — add contextual empty states |
| `components/session/coach-status.tsx` | CREATE |
| `constants/empty-states.ts` | CREATE — empty state copy per screen |

## Dependencies

- **Blocks**: Nothing (final polish)
- **Blocked by**: 5A (empty state components), 6C (notification for coach status)
