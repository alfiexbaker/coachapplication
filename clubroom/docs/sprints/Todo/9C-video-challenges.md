# 9C: Video Challenges

**Phase**: 3 — Competitive Edge
**Origin**: Sprint 9, Task 6
**Estimated scope**: 1 task, Heja-killer feature

## Goal

Coaches post skill challenges. Players attempt them at home and upload video. Leaderboard and badge awards for best attempts. This is the engagement hook that keeps athletes active between sessions.

## Tasks

### Task 1: Video Challenges

**File**: `app/drills/challenges.tsx` + `components/drills/challenge-card.tsx`

```
┌─────────────────────────────────────┐
│ Weekly Challenge                    │
│                                     │
│ [▶ Coach video demo]               │
│                                     │
│ "10 consecutive keepy-ups          │
│  without the ball touching          │
│  the ground"                        │
│                                     │
│ Due: Sunday 9 Feb                   │
│ 12 of 18 squad members completed   │
│                                     │
│ [Submit My Attempt]                │
│                                     │
│ Completed:                          │
│ [▶] Jake B. — 14 keepy-ups!       │
│ [▶] Emma R. — 11 keepy-ups        │
│ [▶] Tom S. — 10 keepy-ups         │
└─────────────────────────────────────┘
```

- Coach creates challenge: title, description, demo video, deadline
- Players see challenge in their drills/homework section
- Players upload video attempt (camera or gallery)
- Leaderboard shows completions
- Coach can award badge for best attempts
- Squad-wide challenges encourage friendly competition

## New Types

```typescript
interface VideoChallenge {
  id: string;
  coachId: string;
  clubId?: string;
  squadId?: string;
  title: string;
  description: string;
  demoVideoUrl?: string;
  deadline: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  submissions: ChallengeSubmission[];
  createdAt: string;
}

interface ChallengeSubmission {
  id: string;
  challengeId: string;
  athleteId: string;
  athleteName: string;
  videoUrl: string;
  submittedAt: string;
  coachFeedback?: string;
  badgeAwarded?: string;
}
```

## Acceptance Criteria

- [ ] Coach creates challenge with title, description, demo video, deadline
- [ ] Players see challenge and can submit video attempt
- [ ] Leaderboard shows completions
- [ ] Coach can award badge for best attempts
- [ ] Squad-wide challenges visible to all squad members

## Files Changed

| File | Action |
|------|--------|
| `app/drills/challenges.tsx` | CREATE |
| `components/drills/challenge-card.tsx` | CREATE |
| `app/drills/[id].tsx` | ENHANCE (650 lines exist) — add challenge leaderboard |
| `services/challenge-service.ts` | CREATE |

## Dependencies

- **Blocks**: Nothing
- **Blocked by**: 9B (references drill library patterns)
