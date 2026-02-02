# Sprint 9: Player Development That Wows

## Goal

The development tracking is so visual and satisfying that parents screenshot it and share with family. Coaches get pre-built session plans and a drill library. This is what makes us "not just another team app" — we actually improve players.

## Why This Matters

Spond has ZERO development tools. CoachNow charges for them. TeamSnap+ locks coaching content behind a paywall. We include world-class development tracking for free. Parents see their child improving. Coaches look professional. Everyone wins.

## User Stories

| Role | Story |
|------|-------|
| **Parent** | I want to see a visual chart of my child's skills over time |
| **Parent** | I want to see a post-session recap card showing what my child worked on |
| **Parent** | I want to share my child's progress with grandparents/family |
| **Parent** | I want to see how my child compares to their age group (anonymised) |
| **Coach** | I want pre-built session plans I can use or customise |
| **Coach** | I want a drill library with video demos I can assign to players |
| **Coach** | I want to send players video challenges they can attempt at home |
| **Coach** | I want the post-session recap to auto-generate a beautiful card |
| **Athlete** | I want to see my skill radar chart and feel proud of my progress |
| **Athlete** | I want to see the drills my coach set and mark them done |
| **Athlete** | I want to attempt video challenges and show my coach |

## Task 1: Skill Radar Chart

**File**: `components/development/skill-radar.tsx`

A beautiful radar/spider chart showing an athlete's skills:

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
│ ── Shooting unchanged              │
└─────────────────────────────────────┘
```

- 6-axis radar (Passing, Dribbling, Shooting, Defending, Fitness, Goalkeeping)
- Current level vs previous period overlay
- Animated transitions when data changes
- Tap a skill to see detailed progression
- Skill levels: 1-10 scale mapped from session notes + badge awards
- Sharable as image (parent taps "Share" → generates PNG)

## Task 2: Progress Timeline

**File**: `components/development/progress-timeline.tsx`

Scrollable visual timeline of a player's journey:

```
┌─────────────────────────────────────┐
│ Jake's Journey                      │
│                                     │
│ Feb 2026                            │
│ ┌──────────────────────────────┐   │
│ │ 🏅 "First Touch Master"     │   │
│ │ Badge earned — Coach Marcus   │   │
│ │ "Exceptional close control"   │   │
│ └──────────────────────────────┘   │
│ ┌──────────────────────────────┐   │
│ │ ⚽ Session: Passing Drills   │   │
│ │ Effort: ⭐⭐⭐⭐⭐            │   │
│ │ "Great weight of pass today" │   │
│ └──────────────────────────────┘   │
│                                     │
│ Jan 2026                            │
│ ┌──────────────────────────────┐   │
│ │ 🎯 Goal completed!          │   │
│ │ "Master 10 consecutive       │   │
│ │  keep-ups" ✓                 │   │
│ └──────────────────────────────┘   │
│ ┌──────────────────────────────┐   │
│ │ 📈 Dribbling → Level 6      │   │
│ │ Up from Level 4              │   │
│ │ (Top 20% for age group)     │   │
│ └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

Aggregates: sessions, badges, goals, skill level changes, video annotations. One scrollable timeline.

## Task 3: Post-Session Recap Card

**File**: `components/development/session-recap-card.tsx`

Auto-generated beautiful card after coach completes a session (from Sprint 2):

```
┌─────────────────────────────────────┐
│ ┌──────────────────────────────┐   │
│ │ SESSION RECAP                │   │
│ │                              │   │
│ │ Jake B. · 4 Feb 2026        │   │
│ │ with Coach Marcus            │   │
│ │                              │   │
│ │ Focus: Passing & Movement    │   │
│ │ Effort: ⭐⭐⭐⭐ (4/5)       │   │
│ │                              │   │
│ │ ✅ Improvements:             │   │
│ │ • Weight of pass improved    │   │
│ │ • Better off-the-ball runs   │   │
│ │                              │   │
│ │ 📝 Next steps:              │   │
│ │ • Practice 1-2 touch passing │   │
│ │ • Work on weak foot          │   │
│ │                              │   │
│ │ 🏅 Badge: "Passing Pro"     │   │
│ │                              │   │
│ │ ─── Clubroom ───            │   │
│ └──────────────────────────────┘   │
│                                     │
│ [Share with Family] [Save]         │
└─────────────────────────────────────┘
```

- Auto-generated from session notes + attendance + badges
- Shareable as image (WhatsApp, Instagram Stories)
- Parent sees it in booking detail and gets notification
- Coach sees it in their feed as a post

## Task 4: Session Plan Templates

**File**: `app/sessions/plan-templates.tsx` + `components/coach/session-plan-picker.tsx`

Pre-built session plans coaches can use or customise:

```
┌─────────────────────────────────────┐
│ Session Plan Templates              │
│                                     │
│ [U7-U9] [U10-U12] [U13-U15] [U16+]│
│                                     │
│ ┌──────────────────────────────┐   │
│ │ 🏃 Dribbling Fundamentals   │   │
│ │ U10-U12 · 60 min · Beginner │   │
│ │                              │   │
│ │ Warmup: Ball mastery (10m)   │   │
│ │ Main: Cone dribbling (20m)   │   │
│ │       1v1 channel games (20m)│   │
│ │ Cool: Passing pairs (10m)    │   │
│ │                              │   │
│ │ Equipment: Cones, bibs       │   │
│ │                              │   │
│ │ [Use This Plan] [Customise]  │   │
│ └──────────────────────────────┘   │
│                                     │
│ ┌──────────────────────────────┐   │
│ │ ⚽ Passing & Movement        │   │
│ │ U10-U12 · 60 min · All      │   │
│ │ ...                          │   │
│ └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

**Templates included** (football-specific):

| Category | Plans |
|----------|-------|
| Dribbling | Fundamentals, 1v1 Skills, Close Control, Speed Dribbling |
| Passing | Short Passing, Long Passing, Passing Under Pressure, Combination Play |
| Shooting | Finishing Basics, Volleys & Half-Volleys, Shooting from Distance, 1v1 with Keeper |
| Defending | Tackling, Positioning, Pressing, 1v1 Defending |
| Goalkeeping | Shot Stopping, Distribution, Positioning, Crosses |
| Fitness | Speed & Agility, Endurance, Change of Direction |
| Tactical | Small-Sided Games, Team Shape, Set Pieces, Counter-Attack |

Each plan:
- Age-group appropriate
- Timed warmup / main / cooldown sections
- Equipment list
- Coaching points per activity
- Can be used as-is or customised and saved

## Task 5: Drill Library with Video

**File**: `app/drills/library.tsx` — ENHANCE

Searchable drill library:

```
┌─────────────────────────────────────┐
│ Drill Library                       │
│ [🔍 Search drills...]              │
│                                     │
│ [All] [Warmup] [Technique]         │
│ [Fitness] [Tactical] [Cooldown]    │
│                                     │
│ ┌──────────────────────────────┐   │
│ │ [▶ video thumbnail]          │   │
│ │ Cone Weave Dribbling         │   │
│ │ 🏃 Technique · 10 min        │   │
│ │ ⚙ Beginner · Cones needed   │   │
│ │ [Assign to Player] [Add to   │   │
│ │  Session Plan]               │   │
│ └──────────────────────────────┘   │
│                                     │
│ ┌──────────────────────────────┐   │
│ │ [▶ video thumbnail]          │   │
│ │ Triangle Passing             │   │
│ │ ⚽ Technique · 15 min        │   │
│ │ ⚙ All levels · Cones, bibs  │   │
│ │ [Assign] [Add to Plan]      │   │
│ └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

- Pre-loaded drill database (30-50 football drills)
- Video demo for each (placeholder URLs for now, real videos later)
- Filter by category, difficulty, duration, equipment needed
- Coach can assign drills directly to players from library
- Coach can add drills to a session plan

## Task 6: Video Challenges (Heja-Killer Feature)

**File**: `app/drills/challenges.tsx` + `components/drills/challenge-card.tsx`

Coaches post skill challenges. Players attempt them at home and upload video:

```
┌─────────────────────────────────────┐
│ 🎯 Weekly Challenge                │
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
│ ┌──────────────────────────────┐   │
│ │ [▶] Jake B. — 14 keepy-ups! │   │
│ │ [▶] Emma R. — 11 keepy-ups  │   │
│ │ [▶] Tom S. — 10 keepy-ups   │   │
│ └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

- Coach creates challenge: title, description, demo video, deadline
- Players see challenge in their drills/homework section
- Players upload video attempt (camera or gallery)
- Leaderboard shows completions
- Coach can award badge for best attempts
- Squad-wide challenges encourage friendly competition

## Task 7: Shareable Progress Report

**File**: `components/development/progress-report.tsx`

Generates a shareable image/PDF summarising a child's progress:

```
┌─────────────────────────────────────┐
│ ┌──────────────────────────────┐   │
│ │        PROGRESS REPORT       │   │
│ │        January 2026          │   │
│ │                              │   │
│ │ Jake B. · Age 10             │   │
│ │ Coach: Marcus Williams       │   │
│ │                              │   │
│ │ Sessions: 8 this month       │   │
│ │ Attendance: 100%             │   │
│ │                              │   │
│ │ [Radar Chart]                │   │
│ │                              │   │
│ │ Key Progress:                │   │
│ │ ⬆ Passing: Level 4 → 6     │   │
│ │ ⬆ Dribbling: Level 5 → 6   │   │
│ │ ── Shooting: Level 5        │   │
│ │                              │   │
│ │ Badges Earned: 3            │   │
│ │ 🏅 Passing Pro               │   │
│ │ 🏅 Consistent Trainer       │   │
│ │ 🏅 First Touch Master       │   │
│ │                              │   │
│ │ Goals: 2/3 completed        │   │
│ │ ✅ Master keepy-ups          │   │
│ │ ✅ Improve weak foot         │   │
│ │ ○  Score from outside box    │   │
│ │                              │   │
│ │ Coach's Note:                │   │
│ │ "Jake has shown fantastic    │   │
│ │  progress this month,        │   │
│ │  especially in passing..."   │   │
│ │                              │   │
│ │      ─── Clubroom ───       │   │
│ └──────────────────────────────┘   │
│                                     │
│ [Share] [Download PDF] [Print]     │
└─────────────────────────────────────┘
```

- Auto-generated monthly or on-demand
- Includes radar chart, badges, goals, coach notes
- Exportable as image or PDF
- Parents share with family — this is organic marketing

## Acceptance Criteria

- [ ] Skill radar chart shows 6-axis spider chart with current vs previous overlay
- [ ] Progress timeline shows chronological journey (sessions, badges, goals, skill changes)
- [ ] Post-session recap generates beautiful shareable card
- [ ] 30+ session plan templates categorised by age group and focus
- [ ] Drill library with 30+ drills, filterable by category/difficulty/equipment
- [ ] Coaches can assign drills to players from library
- [ ] Video challenges: coach creates, players submit attempts, leaderboard
- [ ] Monthly progress report auto-generated, shareable as image/PDF
- [ ] Radar chart animates on load
- [ ] All sharable content includes Clubroom branding (organic marketing)

## Files Changed

| File | Action |
|------|--------|
| `components/development/skill-radar.tsx` | CREATE |
| `components/development/progress-timeline.tsx` | CREATE |
| `components/development/session-recap-card.tsx` | CREATE |
| `components/development/progress-report.tsx` | CREATE |
| `app/sessions/plan-templates.tsx` | CREATE |
| `app/drills/library.tsx` | REBUILD — searchable library |
| `app/drills/challenges.tsx` | CREATE — video challenges |
| `components/drills/challenge-card.tsx` | CREATE |
| `components/coach/session-plan-picker.tsx` | CREATE |
| `constants/session-plan-templates.ts` | CREATE — 30+ football plans |
| `constants/drill-library.ts` | CREATE — 30+ football drills |
| `services/challenge-service.ts` | CREATE |
| `services/progress-service.ts` | MODIFY — radar data aggregation |

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
  deadline: string; // ISO date
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

interface SessionPlanTemplate {
  id: string;
  title: string;
  ageGroup: 'U7-U9' | 'U10-U12' | 'U13-U15' | 'U16+' | 'ALL';
  focus: string; // Dribbling, Passing, etc.
  duration: number; // minutes
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ALL';
  warmup: PlanActivity;
  mainActivities: PlanActivity[];
  cooldown: PlanActivity;
  equipment: string[];
  coachingPoints: string[];
  isSystem: boolean; // true = platform-provided, false = coach-created
}

interface PlanActivity {
  title: string;
  duration: number;
  description: string;
  coachingPoints?: string[];
  diagram?: string; // URL to diagram image
}

interface ProgressReport {
  athleteId: string;
  athleteName: string;
  period: string; // "January 2026"
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

## DB Tables (add to API_README)

```sql
CREATE TABLE video_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES users(id),
  club_id UUID REFERENCES clubs(id),
  squad_id UUID REFERENCES squads(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  demo_video_url TEXT,
  deadline DATE,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE challenge_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES video_challenges(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL,
  athlete_name VARCHAR(255),
  video_url TEXT NOT NULL,
  coach_feedback TEXT,
  badge_award_id UUID REFERENCES badge_awards(id),
  submitted_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE session_plan_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES users(id), -- NULL for system templates
  title VARCHAR(255) NOT NULL,
  age_group VARCHAR(20),
  focus VARCHAR(50),
  duration INTEGER,
  difficulty VARCHAR(20),
  plan JSONB NOT NULL, -- { warmup, mainActivities, cooldown, equipment, coachingPoints }
  is_system BOOLEAN DEFAULT FALSE,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_challenges_coach ON video_challenges(coach_id);
CREATE INDEX idx_submissions_challenge ON challenge_submissions(challenge_id);
CREATE INDEX idx_templates_age ON session_plan_templates(age_group);
```
