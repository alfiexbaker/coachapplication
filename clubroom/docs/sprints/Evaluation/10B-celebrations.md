# 10B: Achievement Celebrations

**Phase**: 3 — Competitive Edge
**Origin**: Sprint 10, Task 3
**Estimated scope**: 1 task (4 celebration types), the delight layer

## Goal

Key moments trigger full-screen celebrations with confetti, share buttons, and genuine delight. Badge earned, goal completed, coach milestone, new review — each feels special.

## Tasks

### Task 1: Achievement Celebrations

**File**: `components/celebrations/`

**Badge Earned** (`badge-celebration.tsx`):
- Full-screen overlay with confetti animation
- Badge icon bounces in
- Athlete name, coach name, reason
- [Share with Family] [Close]
- Auto-dismiss after 5 seconds if not interacted with

**Goal Completed** (`goal-celebration.tsx`):
- Target icon, progress bar at 100%
- Confetti animation
- [Share] [Set New Goal] [Close]

**Coach Milestone** (`coach-milestone.tsx`):
- Milestones: 10, 25, 50, 100, 250, 500 sessions
- Also: first 5-star review, 10 athletes on roster, first trial conversion
- [Share Achievement] [Close]

**New Review** (`review-celebration.tsx`):
- Star rating animation (stars fill left-to-right)
- Review text quote
- [Share on Profile] [Close]

**Shared infrastructure** (`confetti.tsx`):
- Reusable confetti component (use `react-native-confetti-cannon` or similar)
- Subtle sound effect (optional)
- Share button generates image card

## Acceptance Criteria

- [ ] Badge earned triggers full-screen confetti celebration with share button
- [ ] Goal completed triggers celebration with share button
- [ ] Coach milestones celebrated (10, 25, 50, 100 sessions + first review + etc.)
- [ ] New 5-star review triggers celebration for coach
- [ ] Celebrations are shareable as images (organic marketing)

## Files Changed

| File | Action |
|------|--------|
| `components/celebrations/badge-celebration.tsx` | CREATE |
| `components/celebrations/goal-celebration.tsx` | CREATE |
| `components/celebrations/coach-milestone.tsx` | CREATE |
| `components/celebrations/review-celebration.tsx` | CREATE |
| `components/celebrations/confetti.tsx` | CREATE |
| `services/milestone-service.ts` | CREATE — track coach milestones |
| `constants/milestones.ts` | CREATE — milestone definitions |

## Dependencies

- **Blocks**: Nothing
- **Blocked by**: 9D (goal completion triggers), 2A (session completion triggers)
