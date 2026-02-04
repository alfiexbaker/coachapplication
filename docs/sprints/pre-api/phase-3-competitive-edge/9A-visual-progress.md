# 9A: Visual Progress — Radar Chart + Timeline + Recap

**Phase**: 3 — Competitive Edge
**Origin**: Sprint 9, Tasks 1, 2, 3
**Estimated scope**: 3 tasks, the visual wow factor

## Goal

Development tracking is so visual and satisfying that parents screenshot it and share with family. Skill radar chart, progress timeline, and auto-generated recap cards.

## Why This Matters

Spond has ZERO development tools. CoachNow charges for them. We include world-class development tracking for free. This is the screenshot-and-share feature.

## Tasks

### Task 1: Skill Radar Chart

**File**: `components/development/skill-radar.tsx`

```
┌─────────────────────────────────────┐
│ Jake's Skills                       │
│                                     │
│         Passing                     │
│           ●                         │
│          /|\                        │
│    Drib /  |  \ Shooting           │
│     ●──    |    ──●                │
│        \   |   /                    │
│    Def  \  |  /  Fitness           │
│     ●────\ | /────●                │
│            \|/                      │
│         Goalkeep                    │
│            ●                        │
│                                     │
│ ── Current  -- Last month          │
│                                     │
│ ⬆ Passing improved 2 levels       │
│ ⬆ Dribbling improved 1 level      │
└─────────────────────────────────────┘
```

- 6-axis radar (Passing, Dribbling, Shooting, Defending, Fitness, Goalkeeping)
- Current level vs previous period overlay
- Animated transitions when data changes
- Tap a skill to see detailed progression
- Skill levels: 1-10 scale mapped from session notes + badge awards
- Sharable as image

### Task 2: Progress Timeline

**File**: `components/development/progress-timeline.tsx`

Scrollable visual timeline of a player's journey:

- Aggregates: sessions, badges, goals, skill level changes, video annotations
- Grouped by month
- Each entry type has distinct visual (badge = gold, session = green, goal = target)
- One scrollable timeline

### Task 3: Post-Session Recap Card

**File**: `components/development/session-recap-card.tsx`

Auto-generated beautiful card after coach completes a session:

```
┌──────────────────────────────┐
│ SESSION RECAP                │
│                              │
│ Jake B. · 4 Feb 2026        │
│ with Coach Marcus            │
│                              │
│ Focus: Passing & Movement    │
│ Effort: ⭐⭐⭐⭐ (4/5)       │
│                              │
│ ✅ Improvements:             │
│ • Weight of pass improved    │
│ • Better off-the-ball runs   │
│                              │
│ 📝 Next steps:              │
│ • Practice 1-2 touch passing │
│                              │
│ 🏅 Badge: "Passing Pro"     │
│                              │
│ ─── Clubroom ───            │
└──────────────────────────────┘

[Share with Family] [Save]
```

- Auto-generated from session notes + attendance + badges
- Shareable as image (WhatsApp, Instagram Stories)
- Parent sees it in booking detail and gets notification

## Acceptance Criteria

- [ ] Skill radar chart shows 6-axis spider chart with current vs previous overlay
- [ ] Radar chart animates on load
- [ ] Progress timeline shows chronological journey (sessions, badges, goals, skill changes)
- [ ] Post-session recap generates beautiful shareable card
- [ ] All shareable content includes Clubroom branding (organic marketing)

## Files Changed

| File | Action |
|------|--------|
| `components/development/skill-radar.tsx` | CREATE (NOTE: `components/analytics/skill-radar.tsx` exists — may reuse) |
| `components/development/progress-timeline.tsx` | CREATE |
| `components/development/session-recap-card.tsx` | CREATE |
| `app/development/athlete/[athleteId].tsx` | ENHANCE (1001 lines exist) — add radar + timeline |
| `app/development/child-progress/[childId].tsx` | ENHANCE (468 lines exist) |

## Dependencies

- **Blocks**: 9D (progress report uses radar chart)
- **Blocked by**: 2A (needs completed sessions for data)
