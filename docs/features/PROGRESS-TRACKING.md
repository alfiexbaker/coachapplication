# Progress & Skills Tracking

> Complete documentation for athlete progress tracking, skill development, goals, and session feedback.

---

## Overview

The progress tracking system allows:
- Coaches to track athlete skill development over time
- Athletes to view their own progress dashboards
- Parents to monitor children's development
- Goals with milestones and progress tracking
- Session-by-session feedback and notes

---

## Feature Summary

| Feature | Status | Description |
|---------|--------|-------------|
| Skill Tracking | Complete | Track 6 core skills (1-10 scale) |
| Progress Dashboard | Complete | Visual charts and trends |
| Goal Management | Complete | Create, track, complete goals |
| Session Feedback | Complete | Post-session notes and ratings |
| Parent View | Complete | View children's progress |
| Coach View | Complete | Track all roster athletes |

---

## Bilateral Data Flow

### Coach → Parent/Athlete Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     COACH ACTIONS                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   CREATES/UPDATES:                │   CONTROLS VISIBILITY:      │
│   ──────────────────              │   ────────────────────      │
│   • Skill ratings (1-10)          │   • coach_only: Only coach  │
│   • Session feedback              │   • parent: Coach + parent  │
│   • Goals for athletes            │   • athlete: All can view   │
│   • Private coach notes           │                             │
│                                   │                             │
│   DATA FLOWS TO:                  │                             │
│   ──────────────                  │                             │
│   → progress-service.ts           │                             │
│   → addSessionFeedback()          │                             │
│   → updateSkillLevel()            │                             │
│   → createGoal()                  │                             │
│                                   │                             │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                  VISIBILITY FILTER                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   getFeedbackForAthlete(athleteId, viewerRole, limit)           │
│                                                                 │
│   viewerRole: 'coach'  → All feedback, including privateNotes   │
│   viewerRole: 'parent' → visibility !== 'coach_only', no notes  │
│   viewerRole: 'athlete'→ visibility === 'athlete' only          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                  PARENT/ATHLETE VIEWS                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   PARENT SEES:                    │   ATHLETE SEES:             │
│   ────────────                    │   ─────────────             │
│   • publicSummary                 │   • publicSummary           │
│   • skillRatings                  │   • skillRatings            │
│   • improvements                  │   • improvements            │
│   • homework                      │   • homework                │
│   • Goals for their child         │   • Own goals               │
│   ✗ privateNotes (filtered out)   │   ✗ privateNotes            │
│                                   │                             │
└─────────────────────────────────────────────────────────────────┘
```

### Visibility Controls in SessionFeedback

```typescript
interface SessionFeedback {
  // Coach-visible fields
  privateNotes?: string;           // NEVER sent to parent/athlete

  // Parent/Athlete-visible fields
  publicSummary: string;           // Always visible
  skillsWorkedOn: string[];
  skillRatings: Array<{ skill: string; rating: number }>;
  improvements: string;
  homework: string;

  // Visibility control
  visibility: 'coach_only' | 'parent' | 'athlete';
}
```

---

## Screens & Routes

### Athlete Progress

| Screen | Route | Purpose |
|--------|-------|---------|
| My Progress | `/development/my-progress` | Athlete's own dashboard |
| Session Detail | `/development/session/[sessionId]` | Single session analytics |

### Parent View

| Screen | Route | Purpose |
|--------|-------|---------|
| Child Progress | `/development/child-progress/[childId]` | View child's progress |
| Child Session | `/development/athlete-session/[sessionId]` | Child's session detail |

### Coach View

| Screen | Route | Purpose |
|--------|-------|---------|
| Athlete Progress | `/development/athlete/[athleteId]` | View athlete progress |
| Athlete Analytics | `/analytics/[athleteId]` | Deep analytics view |

### Goals

| Screen | Route | Purpose |
|--------|-------|---------|
| Goals Hub | `/goals/index` | List all goals |
| Goal Detail | `/goals/[id]` | Single goal view |
| Create Goal | `/goals/create` | New goal form |

---

## Skill Tracking System

### Core Skills (6)

| Skill | Icon | Description |
|-------|------|-------------|
| Dribbling | ⚽ | Ball control and movement |
| Passing | 🎯 | Distribution and vision |
| Defending | 🛡️ | Defensive positioning |
| Finishing | 🥅 | Shooting and scoring |
| Goalkeeping | 🧤 | GK-specific skills |
| Conditioning | 💪 | Physical fitness |

### Skill Level Scale

```
Level 1-2:  Beginner      (Learning basics)
Level 3-4:  Developing    (Building foundation)
Level 5-6:  Intermediate  (Consistent application)
Level 7-8:  Advanced      (High proficiency)
Level 9-10: Elite         (Expert level)
```

### Skill Data Model

```typescript
interface SkillLevel {
  id: string;
  athleteId: string;
  skill: string;                   // "Dribbling"
  level: number;                   // 1-10
  previousLevel?: number;          // For trend calculation
  lastUpdated: string;
  updatedBy: string;               // Coach ID
  trend: 'improving' | 'steady' | 'declining';
  history: SkillHistoryEntry[];    // Last 20 entries
}

interface SkillHistoryEntry {
  date: string;
  level: number;
  coachId: string;
  coachName?: string;
  sessionId?: string;
  notes?: string;
}
```

### Trend Calculation

Based on last 3 history entries:

```typescript
function calculateTrend(history: SkillHistoryEntry[]): Trend {
  if (history.length < 3) return 'steady';

  const recent = history.slice(-3);
  const first = recent[0].level;
  const average = recent.reduce((sum, h) => sum + h.level, 0) / 3;

  if (average > first + 0.3) return 'improving';
  if (average < first - 0.3) return 'declining';
  return 'steady';
}
```

---

## Progress Dashboard

### Athlete Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                      My Progress                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │                    SKILL OVERVIEW                        │  │
│   │                                                          │  │
│   │   Dribbling    ████████████████░░░░  8.2  ↑             │  │
│   │   Passing      ██████████████░░░░░░  7.0  ─             │  │
│   │   Defending    ████████████░░░░░░░░  6.0  ↑             │  │
│   │   Finishing    ██████████████████░░  9.0  ↑             │  │
│   │   Conditioning ████████████░░░░░░░░  6.5  ─             │  │
│   │                                                          │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │                  PROGRESS OVER TIME                      │  │
│   │                                                          │  │
│   │   10│         ╭─────╮                                   │  │
│   │    8│    ╭────╯     ╰──╮                                │  │
│   │    6│ ───╯             ╰───                             │  │
│   │    4│                                                   │  │
│   │    2│                                                   │  │
│   │     └──────────────────────────                         │  │
│   │      Jan   Feb   Mar   Apr   May                        │  │
│   │                                                          │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│   ┌───────────────────┐  ┌───────────────────┐                 │
│   │ Total Sessions    │  │ Badges Earned     │                 │
│   │      47           │  │       5           │                 │
│   └───────────────────┘  └───────────────────┘                 │
│                                                                 │
│   RECENT SESSIONS                                               │
│   ─────────────────────────────────────────────────────         │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ Jan 12 • Coach Sarah • Dribbling, Finishing            │  │
│   │ Rating: ⭐⭐⭐⭐⭐ • "Great progress on weak foot"      │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Skill Radar Chart

Visual representation of all skills:

```
              Dribbling (8.2)
                    │
                   ╱ ╲
                  ╱   ╲
    Conditioning ╱     ╲ Passing
         (6.5) ╱       ╲ (7.0)
              │         │
              │    ●    │
              │         │
              ╲       ╱
    Goalkeeping╲     ╱ Defending
         (5.0) ╲   ╱  (6.0)
                ╲ ╱
                 │
            Finishing (9.0)
```

---

## Goal Management

### Goal Structure

```typescript
interface Goal {
  id: string;
  athleteId: string;

  // Content
  title: string;
  description?: string;
  category: GoalCategory;

  // Timeline
  targetDate?: string;
  createdAt: string;
  completedAt?: string;

  // Progress
  progress: number;                 // 0-100%
  milestones: GoalMilestone[];

  // Status
  status: 'ACTIVE' | 'COMPLETED' | 'ABANDONED';

  // Creator
  createdBy: 'COACH' | 'ATHLETE' | 'PARENT';
  createdById: string;
}

interface GoalMilestone {
  id: string;
  title: string;
  isCompleted: boolean;
  completedAt?: string;
}

type GoalCategory =
  | 'SKILL'           // Technical improvement
  | 'FITNESS'         // Physical goals
  | 'COMPETITION'     // Match/tournament goals
  | 'BEHAVIOR'        // Training habits
  | 'ACHIEVEMENT';    // Badges, milestones
```

### Goal UI

```
┌─────────────────────────────────────────────────────────────────┐
│                         My Goals                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ 🎯 Improve weak foot finishing                          │  │
│   │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 75%            │  │
│   │                                                          │  │
│   │ Target: March 15, 2026                                   │  │
│   │ Category: SKILL                                          │  │
│   │                                                          │  │
│   │ Milestones:                                              │  │
│   │ ✓ Practice weak foot 3x per week                        │  │
│   │ ✓ Score 5 goals with weak foot in training              │  │
│   │ ○ Score weak foot goal in match                         │  │
│   │                                                          │  │
│   │                              [View Details]              │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ 💪 Improve stamina for full 90 minutes                  │  │
│   │ ━━━━━━━━━━━━━━━━━━━━━━━━░░░░░░░░░░░░░░░░ 40%            │  │
│   │                                                          │  │
│   │ Target: April 1, 2026                                    │  │
│   │ Category: FITNESS                                        │  │
│   │                              [View Details]              │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│                        [+ Create Goal]                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Session Feedback

### Feedback Structure

```typescript
interface SessionFeedback {
  id: string;
  sessionId: string;
  bookingId: string;
  coachId: string;
  athleteId: string;

  // Ratings
  effortRating: number;            // 1-5 stars
  overallPerformance: number;      // 1-5 stars

  // Skills Worked
  skillsWorkedOn: string[];        // ["Dribbling", "Finishing"]
  skillRatings?: SkillRating[];    // Individual skill ratings

  // Notes
  publicSummary: string;           // Visible to athlete/parent
  privateNotes?: string;           // Coach only
  improvements: string;            // Areas to work on
  homework?: string;               // Practice assignments

  // Media
  videoClipUrls?: string[];

  // Badge (optional)
  badgeAwarded?: string;           // Badge ID if awarded

  // Visibility
  visibility: 'coach_only' | 'parent' | 'athlete';

  // Timestamps
  createdAt: string;
}

interface SkillRating {
  skill: string;
  rating: number;                  // 1-10
  notes?: string;
}
```

### Feedback Form (Coach)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Session Feedback                              │
│                    Tom Henderson • Jan 14, 2026                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   SKILLS WORKED ON                                              │
│   ─────────────────────────────────────────────────────         │
│   [✓] Dribbling  [✓] Finishing  [ ] Passing  [ ] Defending     │
│                                                                 │
│   SKILL RATINGS                                                 │
│   ─────────────────────────────────────────────────────         │
│   Dribbling:     ★★★★★★★★☆☆  8/10                              │
│   Finishing:     ★★★★★★★★★☆  9/10                              │
│                                                                 │
│   EFFORT RATING                                                 │
│   ─────────────────────────────────────────────────────         │
│   ⭐⭐⭐⭐⭐  Excellent effort                                   │
│                                                                 │
│   SESSION SUMMARY (shared with parent)                          │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ Great session today. Tom showed excellent focus and      │  │
│   │ made significant progress on his weak foot finishing.    │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│   AREAS FOR IMPROVEMENT                                         │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ Continue working on first touch under pressure.          │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│   HOMEWORK                                                      │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ Practice weak foot 20 mins daily. Focus on low driven   │  │
│   │ shots across the keeper.                                 │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│   PRIVATE NOTES (coach only)                                    │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ Tom mentioned knee discomfort. Monitor next session.     │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│   [ ] Award badge for this session                              │
│                                                                 │
│                        [Save Feedback]                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Services

### progress-service.ts

```typescript
class ProgressService {
  // Skill Tracking
  getSkillLevels(athleteId: string): Promise<SkillLevel[]>
  updateSkillLevel(athleteId: string, skill: string, level: number, coachId: string): Promise<SkillLevel>
  getSkillHistory(athleteId: string, skill: string): Promise<SkillHistoryEntry[]>

  // Session Feedback
  createFeedback(feedback: Omit<SessionFeedback, 'id'>): Promise<SessionFeedback>
  getFeedback(sessionId: string): Promise<SessionFeedback | null>
  getFeedbackForAthlete(athleteId: string): Promise<SessionFeedback[]>

  // Analytics
  getProgressSummary(athleteId: string): Promise<ProgressSummary>
  getSessionStats(athleteId: string): Promise<SessionStats>
}
```

### goal-service.ts

```typescript
class GoalService {
  // CRUD
  createGoal(goal: Omit<Goal, 'id'>): Promise<Goal>
  getGoal(id: string): Promise<Goal | null>
  getGoalsForAthlete(athleteId: string): Promise<Goal[]>
  updateGoal(id: string, data: Partial<Goal>): Promise<Goal>
  deleteGoal(id: string): Promise<void>

  // Progress
  updateProgress(goalId: string, progress: number): Promise<Goal>
  completeMilestone(goalId: string, milestoneId: string): Promise<Goal>

  // Status
  completeGoal(goalId: string): Promise<Goal>
  abandonGoal(goalId: string): Promise<Goal>
}
```

---

## Components

### Progress Components

| Component | Path | Purpose |
|-----------|------|---------|
| `ProgressScreen` | `/components/progress/ProgressScreen.tsx` | Main dashboard |
| `SkillProgressBar` | `/components/analytics/skill-progress-bar.tsx` | Skill visualization |
| `skill-radar` | `/components/analytics/skill-radar.tsx` | Radar chart |
| `progress-chart` | `/components/analytics/progress-chart.tsx` | Time-series chart |
| `session-timeline` | `/components/analytics/session-timeline.tsx` | Session history |

### Goal Components

| Component | Path | Purpose |
|-----------|------|---------|
| `GoalCard` | `/components/goals/GoalCard.tsx` | Goal display card |
| `GoalForm` | `/components/goals/GoalForm.tsx` | Create/edit form |
| `GoalList` | `/components/goals/GoalList.tsx` | List view |
| `MilestoneList` | `/components/goals/MilestoneList.tsx` | Milestones |
| `ProgressRing` | `/components/goals/ProgressRing.tsx` | Progress circle |
| `CategoryBadge` | `/components/goals/CategoryBadge.tsx` | Category tag |

---

## Storage Keys

| Key | Purpose |
|-----|---------|
| `progress.skill_levels` | Current skill levels |
| `progress.session_feedback` | Session feedback records |
| `progress.goals` | Goal data (also `goals.all`) |
| `athlete_analytics` | Computed analytics |

---

## Files Reference

### Services
- `/services/progress-service.ts`
- `/services/goal-service.ts`
- `/services/analytics-service.ts`

### Screens
- `/app/development/my-progress.tsx`
- `/app/development/child-progress/[childId].tsx`
- `/app/development/athlete/[athleteId].tsx`
- `/app/goals/index.tsx`
- `/app/goals/[id].tsx`
- `/app/goals/create.tsx`

### Components
- `/components/progress/*.tsx`
- `/components/goals/*.tsx`
- `/components/analytics/*.tsx`
