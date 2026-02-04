# 9D: Progress Reports + Athlete Journal + Goal Setting

**Phase**: 3 — Competitive Edge
**Origin**: Sprint 9, Tasks 7, 8, 9
**Estimated scope**: 3 tasks, shareable reports + personal journal + goals

## Goal

Monthly progress reports parents share with family (organic marketing). Athletes write personal journals. Goals set by coach/parent/athlete with milestone tracking.

## Tasks

### Task 1: Shareable Progress Report

**File**: `components/development/progress-report.tsx`

Auto-generated monthly report:

```
┌──────────────────────────────┐
│        PROGRESS REPORT       │
│        January 2026          │
│                              │
│ Jake B. · Age 10             │
│ Coach: Marcus Williams       │
│                              │
│ Sessions: 8 this month       │
│ Attendance: 100%             │
│                              │
│ [Radar Chart]                │
│                              │
│ Key Progress:                │
│ ⬆ Passing: Level 4 → 6     │
│ ⬆ Dribbling: Level 5 → 6   │
│                              │
│ Badges Earned: 3             │
│ Goals: 2/3 completed         │
│                              │
│ Coach's Note:                │
│ "Jake has shown fantastic    │
│  progress this month..."     │
│                              │
│      ─── Clubroom ───       │
└──────────────────────────────┘

[Share] [Download PDF] [Print]
```

- Auto-generated monthly or on-demand
- Includes radar chart, badges, goals, coach notes
- Exportable as image or PDF
- Shared report includes Clubroom branding + app store link (organic marketing)
- Coach notified: "Sarah M. shared Jake's progress report"

**Drill Completion (Action→Reaction):**
When athlete/child marks a drill as complete:
- Coach gets notification: "Jake completed Cone Weave Dribbling"
- Coach can respond with one-tap encouragement: [Great work!] [Keep going!] [Brilliant!]
- Coach drill dashboard shows completion rates: "12/18 completed this week"

### Task 2: Athlete Session Journal

**File**: `app/athlete/journal.tsx` + `components/development/session-journal.tsx`

Athletes (teens/adults) get a personal journal:

```
┌─────────────────────────────────────┐
│ My Session Journal                  │
│                                     │
│ Tue 4 Feb — Coach Marcus            │
│                                     │
│ Coach's notes:                      │
│ "Great improvement on passing..."   │
│                                     │
│ My notes:                           │
│ [Felt more confident on left foot.  │
│  Need to practice 1-2 drill.]      │
│                                     │
│ How I felt: Great                   │
│ Energy level: ⭐⭐⭐⭐ (4/5)       │
│                                     │
│ [Save Entry]                        │
└─────────────────────────────────────┘
```

- Post-session prompt for athletes
- Personal notes field (private — only athlete sees)
- Mood/feeling selector
- Energy level rating
- Timeline view showing all journal entries

### Task 3: Goal Setting

**File**: `app/athlete/goals.tsx` + `components/development/goal-editor.tsx`

```
┌─────────────────────────────────────┐
│ Jake's Goals                        │
│                                     │
│ ┌─ Active Goals ──────────────────┐│
│ │ Master 10 consecutive keepy-ups ││
│ │ Progress: ██████░░ 60%          ││
│ │ Coach says: "Getting close!"    ││
│ │                                  ││
│ │ Improve weak foot passing       ││
│ │ Progress: ████░░░░ 40%          ││
│ │ Set by: Coach Marcus            ││
│ └──────────────────────────────────┘│
│                                     │
│ [+ Set New Goal]                    │
└─────────────────────────────────────┘
```

- Goals can be set by: athlete, parent, or coach
- Progress tracking: manual % update or milestone-based
- Coach can update goal progress during session completion
- Completed goals trigger celebration (10B)
- Suggested goals: "Common goals for age 10"

**Action→Reaction: progress-service Notifications:**

| Service Function | Actor | Notify Who | Message |
|-----------------|-------|-----------|---------  |
| `createGoal` | Coach | Athlete + parent | "Coach Marcus set a new goal: [name]" |
| `updateGoal` | Coach | Athlete + parent | "Your goal [name] was updated" |
| `updateGoalProgress` | Coach | Athlete + parent | "Goal progress: [name] now at [x]%" |
| `addMilestone` | Coach | Athlete + parent | "New milestone added to [goal]" |
| `completeMilestone` | Coach/athlete | Other side | "Milestone completed: [name]" |
| `uncompleteMilestone` | Coach | Athlete | "Milestone marked incomplete" |
| `deleteMilestone` | Coach | Athlete | "Milestone removed from [goal]" |

## New Types

```typescript
interface ProgressReport {
  athleteId: string;
  athleteName: string;
  period: string;
  coachName: string;
  sessionsCount: number;
  attendanceRate: number;
  skillRadar: { skill: string; current: number; previous: number }[];
  badgesEarned: { label: string; reason: string }[];
  goalsProgress: { title: string; completed: boolean }[];
  coachNote?: string;
  generatedAt: string;
}
```

## Acceptance Criteria

- [ ] Monthly progress report auto-generated, shareable as image/PDF
- [ ] Shared reports include Clubroom branding
- [ ] Drill completion → coach notified with one-tap encouragement
- [ ] Athletes can write personal session journal entries (notes, mood, energy)
- [ ] Journal viewable alongside coach's notes
- [ ] Goals can be set by athlete, parent, or coach
- [ ] Goal progress trackable (manual % or milestones)
- [ ] Coach can update goal progress during session completion
- [ ] Completed goals trigger celebration
- [ ] Suggested goals based on age group
- [ ] All 7 progress-service notifications wired

## Files Changed

| File | Action |
|------|--------|
| `components/development/progress-report.tsx` | CREATE |
| `app/athlete/journal.tsx` | CREATE |
| `components/development/session-journal.tsx` | CREATE |
| `app/athlete/goals.tsx` | ENHANCE existing |
| `components/development/goal-editor.tsx` | CREATE |
| `app/goals/index.tsx` | ENHANCE (434 lines exist) |
| `app/goals/[id].tsx` | ENHANCE (672 lines exist) |
| `app/goals/create.tsx` | ENHANCE (189 lines exist) |
| `services/progress-service.ts` | MODIFY — notifications + radar data |

## Dependencies

- **Blocks**: Nothing
- **Blocked by**: 9A (uses radar chart), 2A (needs completed sessions)
