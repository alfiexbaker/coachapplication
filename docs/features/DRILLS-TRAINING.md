# Drills & Training Content

> Coach drill library management with athlete homework assignments, completion tracking, and training analytics.

---

## Overview

The Drills system enables coaches to build a personal library of training exercises and assign them to athletes as homework. Athletes track their progress, complete assignments, and build training streaks.

### Key Features

| Feature | Description |
|---------|-------------|
| Drill Library | Coach's personal collection of exercises |
| Video Demos | Optional video explanations for drills |
| Categories | Warm-up, Technique, Fitness, Cool-down, Tactical |
| Difficulty Levels | Beginner, Intermediate, Advanced |
| Assignments | Assign drills with due dates and notes |
| Completion Tracking | Mark drills complete with feedback |
| Streaks | Daily completion streaks |

---

## Drill Categories

| Category | Icon | Color | Description |
|----------|------|-------|-------------|
| WARMUP | flame | #F59E0B | Pre-training preparation |
| TECHNIQUE | football | #3B82F6 | Skill-based exercises |
| FITNESS | fitness | #10B981 | Physical conditioning |
| COOLDOWN | snow | #6366F1 | Post-training recovery |
| TACTICAL | bulb | #8B5CF6 | Game intelligence drills |

---

## Difficulty Levels

| Level | Color | Background | Use Case |
|-------|-------|------------|----------|
| BEGINNER | #10B981 | #D1FAE5 | New athletes |
| INTERMEDIATE | #F59E0B | #FEF3C7 | Developing skills |
| ADVANCED | #EF4444 | #FEE2E2 | Experienced athletes |

---

## Data Models

### Drill

```typescript
interface Drill {
  id: string;
  coachId: string;
  coachName: string;

  // Content
  title: string;
  description: string;
  category: DrillCategory;
  videoUrl?: string;
  thumbnailUrl?: string;

  // Metadata
  duration: number;           // Minutes
  difficulty: DrillDifficulty;
  equipment?: string[];       // Required equipment
  tags?: string[];           // Searchable tags

  // Stats
  assignmentCount: number;    // Times assigned
  createdAt: string;
  updatedAt: string;
}
```

### AssignedDrill

```typescript
interface AssignedDrill {
  id: string;
  drillId: string;
  drill?: Drill;              // Populated on fetch

  // Assignment
  athleteId: string;
  athleteName: string;
  assignedBy: string;
  assignedByName: string;
  assignedAt: string;

  // Requirements
  dueDate: string;
  notes?: string;             // Coach instructions
  repetitions?: number;       // How many times to do
  priority: 1 | 2 | 3;       // 1=high, 3=low

  // Completion
  isCompleted: boolean;
  completedAt?: string;
  athleteFeedback?: string;   // Athlete notes on completion
}
```

### DrillAssignmentStats

```typescript
interface DrillAssignmentStats {
  totalAssigned: number;
  completed: number;
  pending: number;
  overdue: number;
  completionRate: number;     // Percentage
  byCategory: Record<DrillCategory, {
    total: number;
    completed: number;
  }>;
  currentStreak: number;      // Consecutive days with completions
}
```

---

## Assignment Flow

```
COACH CREATES DRILL              ASSIGNS TO ATHLETE
        │                              │
        ▼                              ▼
┌───────────────┐              ┌───────────────┐
│  DRILL        │              │  ASSIGNMENT   │
│  LIBRARY      │─────────────▶│  Created      │
└───────────────┘              └───────────────┘
                                      │
                                      ▼
                              ┌───────────────┐
                              │  ATHLETE      │
                              │  Dashboard    │
                              └───────────────┘
                                      │
                                      ▼
                              ┌───────────────┐
                              │  MARK         │
                              │  COMPLETE     │
                              └───────────────┘
                                      │
                                      ▼
                              ┌───────────────┐
                              │  STATS        │
                              │  Updated      │
                              └───────────────┘
```

---

## Priority System

| Priority | Label | Sort Order | Use Case |
|----------|-------|------------|----------|
| 1 | High | First | Critical skills work |
| 2 | Normal | Middle | Regular homework |
| 3 | Low | Last | Optional practice |

---

## Drill Service

**File:** `services/drill-service.ts`

### Drill Library Operations

```typescript
const drillService = {
  // Library management
  getDrillLibrary(coachId): Promise<Drill[]>;
  getDrillById(drillId): Promise<Drill | null>;
  createDrill(coachId, coachName, params): Promise<Drill>;
  updateDrill(drillId, updates): Promise<Drill | null>;
  deleteDrill(drillId): Promise<boolean>;
}
```

### Assignment Operations

```typescript
const drillService = {
  // Assignments
  assignDrill(drillId, athleteId, athleteName, assignedBy, assignedByName, params): Promise<AssignedDrill>;
  getAthleteAssignments(athleteId, includeCompleted?): Promise<AssignedDrill[]>;
  getAssignmentById(assignmentId): Promise<AssignedDrill | null>;

  // Completion
  completeDrill(assignmentId, athleteFeedback?): Promise<AssignedDrill | null>;
  uncompleteDrill(assignmentId): Promise<AssignedDrill | null>;
  deleteAssignment(assignmentId): Promise<boolean>;
}
```

### Statistics

```typescript
const drillService = {
  getAssignmentStats(athleteId): Promise<DrillAssignmentStats>;
}
```

### Helper Methods

```typescript
const drillService = {
  // Status checks
  isOverdue(assignment): boolean;
  isDueSoon(assignment): boolean;  // Within 2 days

  // Formatting
  formatDueDate(dateString): string;
  formatDuration(minutes): string;

  // Display info
  getCategoryInfo(category): { label, icon, color };
  getDifficultyInfo(difficulty): { label, color, bgColor };
}
```

---

## Assignment Sorting

Assignments are sorted by:

1. **Completion status** - Incomplete first
2. **Priority** - High (1) before Low (3)
3. **Due date** - Soonest first

```typescript
assignments.sort((a, b) => {
  // Completed goes to end
  if (a.isCompleted !== b.isCompleted) {
    return a.isCompleted ? 1 : -1;
  }
  // Sort by priority
  if (a.priority !== b.priority) {
    return a.priority - b.priority;
  }
  // Sort by due date
  return new Date(a.dueDate) - new Date(b.dueDate);
});
```

---

## Streak Calculation

Tracks consecutive days with completed drills:

```typescript
function calculateStreak(completedAssignments): number {
  // Get unique completion dates
  const completedDates = completedAssignments
    .map(a => formatDateKey(a.completedAt))
    .filter(unique)
    .sort()
    .reverse();

  // Count consecutive days from today
  let streak = 0;
  for (let i = 0; i < completedDates.length; i++) {
    const checkDate = subtractDays(today, i);
    if (completedDates.includes(checkDate)) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}
```

---

## Example Drills

### Technique Drill

```typescript
{
  id: 'drill_1',
  title: 'Ball Juggling Challenge',
  description: 'Practice juggling with both feet, thighs, and head...',
  category: 'TECHNIQUE',
  duration: 15,
  difficulty: 'BEGINNER',
  equipment: ['Football'],
  tags: ['ball control', 'touch', 'coordination']
}
```

### Fitness Drill

```typescript
{
  id: 'drill_2',
  title: 'Sprint Intervals',
  description: 'Perform 10 x 30m sprints with 30 seconds rest...',
  category: 'FITNESS',
  duration: 20,
  difficulty: 'INTERMEDIATE',
  equipment: ['Cones', 'Stopwatch'],
  tags: ['speed', 'endurance', 'agility']
}
```

### Tactical Drill

```typescript
{
  id: 'drill_6',
  title: 'Tactical Positioning Awareness',
  description: 'Watch match analysis video and identify positioning...',
  category: 'TACTICAL',
  duration: 30,
  difficulty: 'ADVANCED',
  tags: ['tactics', 'positioning', 'game intelligence']
}
```

---

## Storage Keys

| Key | Purpose |
|-----|---------|
| `drills.library` | Coach drill libraries |
| `drills.assignments` | Athlete assignments |

---

## API Contracts

### Create Drill

```http
POST /api/drills
Body: CreateDrillInput
Response: Drill
```

### Get Coach Library

```http
GET /api/drills?coachId=coach_1
Response: Drill[]
```

### Assign Drill

```http
POST /api/assignments
Body: {
  drillId: string;
  athleteId: string;
  dueDate: string;
  notes?: string;
  repetitions?: number;
  priority?: 1 | 2 | 3;
}
Response: AssignedDrill
```

### Complete Assignment

```http
PATCH /api/assignments/:id/complete
Body: { athleteFeedback?: string }
Response: AssignedDrill
```

### Get Assignment Stats

```http
GET /api/assignments/:athleteId/stats
Response: DrillAssignmentStats
```

---

## Integration Points

### With Progress Tracking
- Completed drills contribute to skill development
- Category-specific completions influence skill levels

### With Notification Service
- Notifications for new assignments
- Due date reminders
- Streak milestone alerts

### With Badge Service
- "Dedicated Learner" badge for completions
- Streak-based achievements

---

## File References

| Purpose | Path |
|---------|------|
| Service | `services/drill-service.ts` |
| Types | `constants/types.ts` |
| Test Suite | `__tests__/drills/drill-service.test.ts` |
