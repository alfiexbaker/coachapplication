# Analytics Dashboard

> Comprehensive analytics for athletes and coaches with progress tracking, revenue insights, and performance metrics.

---

## Overview

The Analytics system provides detailed insights for both athletes (skill progression, goals, training consistency) and coaches (revenue, sessions, retention, peak hours).

### Key Features

| Feature | Description |
|---------|-------------|
| Athlete Analytics | Skill progression, goal tracking, percentile ranking |
| Coach Analytics | Revenue, sessions, retention, cancellation patterns |
| Time Periods | Week, Month, Quarter, Year, All-time |
| Visual Charts | Revenue trends, peak hours heatmap, skill radar |
| Projections | Revenue projections based on trends |

---

## Athlete Analytics

### AthleteAnalytics Model

```typescript
interface AthleteAnalytics {
  athleteId: string;
  athleteName: string;
  period: AnalyticsPeriod;

  // Session stats
  totalSessions: number;
  sessionsThisPeriod: number;
  averageSessionRating: number;
  attendanceRate: number;

  // Skills
  skills: SkillProgress[];

  // Goals
  activeGoals: Goal[];
  completedGoals: Goal[];

  // Performance metrics
  improvementRate: number;      // Overall improvement %
  consistencyScore: number;     // 0-100 consistency
  percentileRank: number;       // Compared to peers

  // Schedule
  lastSessionDate?: string;
  nextSessionDate?: string;
}
```

### SkillProgress Model

```typescript
interface SkillProgress {
  skillName: string;
  category: 'Technical' | 'Tactical' | 'Physical' | 'Mental';
  currentLevel: number;         // 0-100
  previousLevel: number;
  changePercent: number;
  history: Array<{
    date: string;
    level: number;
  }>;
}
```

### Goal Model

```typescript
interface Goal {
  id: string;
  userId: string;
  athleteId: string;
  title: string;
  description?: string;
  category: GoalCategory;
  targetDate?: string;
  progress: number;             // 0-100
  milestones: GoalMilestone[];
  status: 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
  createdBy: 'COACH' | 'ATHLETE' | 'PARENT';
  createdById: string;
  createdAt: string;
  updatedAt: string;
}
```

### GoalMilestone

```typescript
interface GoalMilestone {
  id: string;
  goalId: string;
  title: string;
  order: number;
  isCompleted: boolean;
  completedAt?: string;
}
```

---

## Coach Analytics

### CoachAnalytics Model

```typescript
interface CoachAnalytics {
  coachId: string;
  coachName: string;
  period: CoachAnalyticsPeriod;
  dateRange: AnalyticsDateRange;

  // Revenue
  totalRevenue: number;
  revenueChange: number;
  revenueChangePercent: number;
  revenueTrend: TrendDirection;
  revenueChart: RevenueDataPoint[];
  projectedRevenue?: number;
  avgRevenuePerSession: number;

  // Sessions
  sessions: SessionStats;

  // Clients
  retention: RetentionMetrics;

  // Cancellations
  cancellations: CancellationStats;

  // Schedule insights
  peakHours: PeakHoursData[];
  busiestDay: { dayOfWeek: number; dayName: string; sessionCount: number };
  busiestHour: { hour: number; sessionCount: number };

  // Skills
  topSkills: TopSkillData[];

  // Ratings
  avgRating: number;
  ratingChange: number;
  reviewCount: number;

  computedAt: string;
}
```

### SessionStats

```typescript
interface SessionStats {
  totalSessions: number;
  sessionsChange: number;
  sessionsChangePercent: number;
  avgSessionsPerWeek: number;
  avgDuration: number;
  popularSessionType: string;
  bySessionType: Array<{
    type: string;
    count: number;
    percentage: number;
    revenue: number;
  }>;
}
```

### RetentionMetrics

```typescript
interface RetentionMetrics {
  newClients: number;
  returningClients: number;
  churnRate: number;
  retentionRate: number;
  avgSessionsPerClient: number;
  totalActiveClients: number;
  clientsLost: number;
}
```

### CancellationStats

```typescript
interface CancellationStats {
  totalCancellations: number;
  cancellationRate: number;
  byReason: Array<{
    reason: CancellationReason;
    count: number;
    percentage: number;
  }>;
  byDayOfWeek: Array<{
    dayOfWeek: number;
    dayName: string;
    count: number;
    percentage: number;
  }>;
  avgNoticeHours: number;
  revenueLost: number;
}
```

### PeakHoursData

```typescript
interface PeakHoursData {
  dayOfWeek: number;
  dayName: string;
  hour: number;
  sessionCount: number;
  intensity: number;            // 0-1 for heatmap
}
```

### RevenueDataPoint

```typescript
interface RevenueDataPoint {
  date: string;
  amount: number;
  sessionCount: number;
}
```

---

## Analytics Periods

| Period | Description | Data Points |
|--------|-------------|-------------|
| WEEK | Last 7 days | Daily |
| MONTH | Current month | Weekly |
| QUARTER | Last 3 months | Weekly |
| YEAR | Current year | Monthly |
| ALL | All time | Monthly |

---

## Dashboard Views

### Athlete Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│                    ATHLETE ANALYTICS                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │    24    │  │   8      │  │   4.5    │  │   95%    │   │
│  │ Sessions │  │ This Mo  │  │ Avg Rate │  │ Attend   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                             │
│  SKILL PROGRESS                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Dribbling  ████████████████████░░░░  72% (+10.8%)    │  │
│  │ Passing    ███████████████████░░░░░  68% (+6.3%)     │  │
│  │ Finishing  ██████████████░░░░░░░░░░  58% (+11.5%)    │  │
│  │ Defending  ████████████░░░░░░░░░░░░  45% (=)         │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ACTIVE GOALS                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🎯 Master weak foot finishing            45%         │  │
│  │    ✓ Complete 5 weak foot drills                     │  │
│  │    ✓ Score 3 goals in training                       │  │
│  │    ○ Score weak foot goal in match                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Coach Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│                     COACH ANALYTICS                          │
├─────────────────────────────────────────────────────────────┤
│  Period: [This Month ▼]                                     │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  £2,340  │  │    45    │  │    22    │  │   4.8    │   │
│  │ Revenue  │  │ Sessions │  │ Clients  │  │ Rating   │   │
│  │ +13.6%   │  │ +12.5%   │  │ 91% ret  │  │ +0.1     │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                             │
│  REVENUE TREND                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │     ╭─╮                                              │  │
│  │    ╱   ╲   ╭──╮                                      │  │
│  │ ──╱     ╲─╱    ╲──                                   │  │
│  │ Jan    Feb   Mar   Apr                               │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  TOP SKILLS TAUGHT                                          │
│  1. Dribbling    18 sessions  40%  £936                    │
│  2. Finishing    12 sessions  27%  £624                    │
│  3. Passing      10 sessions  22%  £520                    │
│                                                             │
│  PEAK HOURS (Heatmap)                                       │
│  ┌────────────────────────────────────────────────────┐    │
│  │    Mon Tue Wed Thu Fri Sat Sun                     │    │
│  │ 9  ░░░ ░░░ ░░░ ░░░ ░░░ ███ ███                     │    │
│  │ 10 ░░░ ░░░ ░░░ ░░░ ░░░ ███ ███                     │    │
│  │ 16 ███ ███ ███ ███ ███ ░░░ ░░░                     │    │
│  │ 17 ███ ███ ███ ███ ███ ░░░ ░░░                     │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Analytics Service

**File:** `services/analytics-service.ts`

### Athlete Analytics

```typescript
const analyticsService = {
  // Get comprehensive athlete analytics
  getAthleteAnalytics(athleteId, period): Promise<AthleteAnalytics | null>;

  // Get skill progression history
  getSkillHistory(athleteId, skillName?): Promise<SkillProgress[]>;

  // Get skill comparison (radar chart data)
  getSkillComparison(athleteId): Promise<{
    skills: { name: string; athleteLevel: number; averageLevel: number }[];
  }>;

  // Update skill level after session
  updateSkillLevel(athleteId, skill, newLevel): Promise<void>;
}
```

### Goal Management

```typescript
const analyticsService = {
  // Goal operations
  getAthleteGoals(athleteId, status?): Promise<Goal[]>;
  createGoal(input): Promise<Goal>;
  updateGoalProgress(goalId, progress): Promise<Goal>;
  completeMilestone(goalId, milestoneId): Promise<Goal>;
  addMilestone(goalId, title): Promise<Goal>;
  abandonGoal(goalId): Promise<Goal>;
}
```

### Coach Analytics

```typescript
const coachAnalyticsService = {
  // Comprehensive analytics
  getCoachAnalytics(coachId, period): Promise<CoachAnalytics | null>;

  // Specific metrics
  getRevenueChart(coachId, period): Promise<RevenueDataPoint[]>;
  getRetentionMetrics(coachId): Promise<RetentionMetrics>;
  getCancellationPatterns(coachId): Promise<CancellationStats>;
  getPeakHours(coachId): Promise<PeakHoursData[]>;
  getTopSkills(coachId): Promise<TopSkillData[]>;
  getSessionStats(coachId): Promise<SessionStats>;
}
```

---

## Trend Direction

```typescript
type TrendDirection = 'UP' | 'DOWN' | 'STABLE';

function getTrendDirection(current: number, previous: number): TrendDirection {
  const changePercent = previous > 0
    ? ((current - previous) / previous) * 100
    : current > 0 ? 100 : 0;

  if (changePercent > 2) return 'UP';
  if (changePercent < -2) return 'DOWN';
  return 'STABLE';
}
```

---

## UI Components

### Analytics Screen
**File:** `components/coach/analytics-screen.tsx`

Displays:
- Summary stat cards
- Revenue/session trends
- Top skills breakdown
- Busiest day insights

### Skill Progress Bar
Shows skill level with change indicator:
- Current level percentage
- Change from previous period
- Color-coded improvement/decline

### Peak Hours Heatmap
7x15 grid showing session density:
- Days of week (columns)
- Hours 6AM-9PM (rows)
- Intensity coloring

---

## Storage Keys

| Key | Purpose |
|-----|---------|
| `athlete_analytics` | Athlete analytics cache |
| `athlete_goals` | Goal data |
| `coach_analytics` | Coach analytics cache |

---

## API Contracts

### Get Athlete Analytics

```http
GET /api/athletes/:athleteId/analytics?period=MONTH
Response: AthleteAnalytics
```

### Get Skill History

```http
GET /api/athletes/:athleteId/skills/history?skill=Dribbling
Response: SkillProgress[]
```

### Create Goal

```http
POST /api/athletes/:athleteId/goals
Body: {
  title: string;
  description?: string;
  category?: GoalCategory;
  targetDate?: string;
  milestones?: string[];
  createdBy: 'COACH' | 'ATHLETE' | 'PARENT';
  createdById: string;
}
Response: Goal
```

### Get Coach Analytics

```http
GET /api/coaches/:coachId/analytics?period=MONTH
Response: CoachAnalytics
```

### Get Revenue Chart

```http
GET /api/coaches/:coachId/revenue?period=QUARTER
Response: RevenueDataPoint[]
```

### Get Peak Hours

```http
GET /api/coaches/:coachId/peak-hours
Response: PeakHoursData[]
```

---

## Integration Points

### With Progress Service
- Skill levels feed into analytics
- Session feedback updates trends

### With Booking Service
- Session counts and types
- Revenue calculations
- Cancellation tracking

### With Badge Service
- Goal completion triggers badges
- Streak achievements

---

## File References

| Purpose | Path |
|---------|------|
| Analytics Service | `services/analytics-service.ts` |
| Coach Analytics Screen | `components/coach/analytics-screen.tsx` |
| Types | `constants/types.ts` |
| Tests | `__tests__/analytics/coach-analytics-service.test.ts` |
