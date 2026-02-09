# Badge & Achievement System - Complete Documentation

## Overview

The badge system allows coaches to recognize athlete achievements through categorized badges with point values, supporting a progression system and social sharing.

---

## 1. Screens & Navigation

| Screen | Path | Purpose |
|--------|------|---------|
| My Badges | `/(tabs)/badges` | Athlete's own achievements |
| Child Badges | `/children/badges/[childId]` | Parent viewing child's badges |
| Child Progress | `/development/child-progress/[childId]` | Full progress with badges tab |
| Development | `/development` | Coach's athlete management |
| Badge Award | Modal component | Award badge to athlete |

---

## 2. Badge Categories

| Category | Icon | Description |
|----------|------|-------------|
| Leadership | people | Team leadership qualities |
| Consistency | refresh | Reliable attendance/effort |
| Technique | football | Technical skill mastery |
| Mindset | bulb | Mental approach to training |
| Teamwork | hand-left | Collaborative skills |
| Resilience | fitness | Bouncing back from setbacks |

---

## 3. Badge Tiers & Points

| Tier | Name | Points | Color |
|------|------|--------|-------|
| 1 | Bronze | 10 | Bronze |
| 2 | Silver | 25 | Silver |
| 3 | Gold | 50 | Gold |

---

## 4. Complete Badge Catalog (15 Badges)

### Consistency Badges

| ID | Name | Tier | Points | Description |
|----|------|------|--------|-------------|
| badge_best_training | Best Training Session | 1 | 10 | Standout session with effort and focus |
| badge_streak_starter | Streak Starter | 1 | 10 | 3 sessions in a row without missing |
| badge_dedicated_athlete | Dedicated Athlete | 2 | 25 | Perfect attendance for a month |

### Technique Badges

| ID | Name | Tier | Points | Description |
|----|------|------|--------|-------------|
| badge_master_passer | Master Passer | 2 | 25 | Reliable build-up play and vision |
| badge_sharp_shooter_pro | Sharp Shooter Pro | 3 | 50 | Clinical finishing under pressure |
| badge_first_touch | Silky First Touch | 1 | 10 | Excellent ball control in tight spaces |

### Leadership Badges

| ID | Name | Tier | Points | Description |
|----|------|------|--------|-------------|
| badge_team_captain | Team Captain | 2 | 25 | Led drills and encouraged teammates |
| badge_vocal_leader | Vocal Leader | 1 | 10 | Communicated well and organized group |
| badge_mentor | Mentor | 3 | 50 | Helped younger players improve |

### Mindset Badges

| ID | Name | Tier | Points | Description |
|----|------|------|--------|-------------|
| badge_growth_mindset | Growth Mindset | 1 | 10 | Embraced challenges, learned from mistakes |
| badge_focused_athlete | Laser Focus | 2 | 25 | Maintained concentration throughout |

### Teamwork Badges

| ID | Name | Tier | Points | Description |
|----|------|------|--------|-------------|
| badge_team_player | Team Player | 1 | 10 | Put team first and supported others |
| badge_assist_king | Assist King | 2 | 25 | Created multiple scoring opportunities |

### Resilience Badges

| ID | Name | Tier | Points | Description |
|----|------|------|--------|-------------|
| badge_comeback_kid | Comeback Kid | 2 | 25 | Bounced back from setbacks |
| badge_never_give_up | Never Give Up | 3 | 50 | Incredible perseverance under pressure |

---

## 5. Milestone Badges (Automatic)

### Session Milestones

| ID | Name | Tier | Points | Requirement |
|----|------|------|--------|-------------|
| milestone_5_sessions | First Five | 1 | 10 | Complete 5 sessions |
| milestone_10_sessions | Double Digits | 1 | 15 | Complete 10 sessions |
| milestone_25_sessions | Quarter Century | 2 | 25 | Complete 25 sessions |
| milestone_50_sessions | Half Century | 2 | 35 | Complete 50 sessions |
| milestone_100_sessions | Century Club | 3 | 50 | Complete 100 sessions |

### Streak Badges

| ID | Name | Tier | Points | Requirement |
|----|------|------|--------|-------------|
| streak_2_weeks | Getting Started | 1 | 10 | Train 2 consecutive weeks |
| streak_4_weeks | Monthly Momentum | 1 | 15 | Train 4 consecutive weeks |
| streak_8_weeks | Two Month Warrior | 2 | 25 | Train 8 consecutive weeks |
| streak_12_weeks | Quarter Year Champion | 3 | 50 | Train 12 consecutive weeks |

**Note:** Milestone badges are defined but not automatically awarded. Mock data uses hardcoded session counts.

---

## 6. Badge Award Flow

### Award Modal

```
┌─────────────────────────────────────────────────┐
│ 🏆 Award Badge to Tom Henderson                 │
├─────────────────────────────────────────────────┤
│                                                 │
│ Badge: [Best Training Session    ▼]             │
│                                                 │
│ Reason:                                         │
│ ○ Leadership   ○ Consistency   ○ Technique      │
│ ○ Mindset      ○ Teamwork      ○ Resilience     │
│                                                 │
│ Quick Presets:                                  │
│ [Lead the pod] [Resilience] [Team-first]        │
│ [Consistency] [Growth mindset] [Technical]      │
│                                                 │
│ Note to parent:                                 │
│ ┌─────────────────────────────────────────┐     │
│ │ Great effort today, kept energy up...   │     │
│ └─────────────────────────────────────────┘     │
│                                                 │
│ 👁️ Visibility: [Supporters ▼]                  │
│                                                 │
│ ⚠️ Cooldown: 7 days between badges             │
│ □ Exception (requires note)                     │
│                                                 │
│        [Cancel]        [Award Badge]            │
└─────────────────────────────────────────────────┘
```

### Cooldown System

- **Window:** 7 days between badges per athlete per coach
- **Exception:** Can bypass with toggle + mandatory reason
- **Display:** Shows days remaining if in cooldown

### Award Presets (6 Total)

| Preset | Badge | Note Template |
|--------|-------|---------------|
| Lead the pod | Leadership | "Set the tempo for the group..." |
| Resilience under pressure | Sharp Shooter | "Bounced back after mistakes..." |
| Team-first play | Master Passer | "Created chances for others..." |
| Week-on-week consistency | (any) | "Showed up early, stayed locked in..." |
| Growth mindset | Growth Mindset | "Took coaching points on quickly..." |
| Technical focus | (any) | "Clean first touch and quality release..." |

---

## 7. Badge Award Data Model

```typescript
interface BadgeAward {
  id: string;
  badgeId: string;
  badgeLabel: string;
  badgeTone?: 'success' | 'warning' | 'default';
  badgeCategory?: BadgeCategory;
  badgeTier?: BadgeTier;
  badgePointValue?: number;

  // Recipient
  athleteId: string;
  athleteName?: string;

  // Awarder
  coachId: string;
  coachName?: string;
  awardedBy: string;
  awardedByName?: string;
  awardedAt: string;

  // Context
  sessionId?: string;
  reason: string;
  note?: string;
  presetId?: string;
  context?: 'session' | 'athlete_profile';

  // Cooldown
  cooldownBypassed?: boolean;
  cooldownWindowDays?: number;
  overrideNote?: string;

  // Visibility
  visibility: BadgeVisibility;
  shared?: boolean;
  feedPostId?: string;

  // Parent tracking
  seenByParent?: boolean;
  seenAt?: string;
}

type BadgeVisibility = 'coach_only' | 'athlete' | 'supporters';
```

---

## 8. Visibility Levels

| Level | Coach Sees | Athlete Sees | Parent Sees | Feed Post | Notification |
|-------|------------|--------------|-------------|-----------|--------------|
| coach_only | ✓ | ✗ | ✗ | ✗ | ✗ |
| athlete | ✓ | ✓ | ✗ | Optional | ✗ |
| supporters | ✓ | ✓ | ✓ | Auto | ✓ |

### Visibility Flow

```
Coach awards badge
        │
        ▼
Is visibility !== 'coach_only'?
        │
   ┌────┴────┐
   │ YES     │ NO
   ▼         ▼
Send parent   Only coach
notification  can see
   │
   ▼
Create achievement
post in club feed
```

---

## 9. Progression System

### Levels

| Level | Name | Points Required |
|-------|------|-----------------|
| 1 | Beginner | 0 |
| 2 | Developing | 50 |
| 3 | Intermediate | 150 |
| 4 | Advanced | 300 |
| 5 | Elite | 500 |

### Category Milestones

Each category has its own milestone progression:

| Milestone | Badges Required |
|-----------|-----------------|
| None | 0-2 |
| Bronze | 3-6 |
| Silver | 7-14 |
| Gold | 15+ |

### Progression Display

```
┌─────────────────────────────────────────────────┐
│ Level 2: Developing                             │
│ ████████████░░░░░░░░░░░░░░░░░░░░ 75/150 pts     │
│                                                 │
│ 75 pts to Intermediate                          │
└─────────────────────────────────────────────────┘
```

---

## 10. Skill Progress System

### Skill Tracking

```typescript
interface SkillLevel {
  skill: string;              // "Dribbling"
  level: number;              // 1-10 scale
  previousLevel?: number;
  lastUpdated: string;
  updatedBy: string;          // Coach ID
  trend: 'improving' | 'steady' | 'declining';
  history: SkillHistoryEntry[];  // Last 20 entries
}

interface SkillHistoryEntry {
  date: string;
  level: number;
  coachId: string;
}
```

### Tracked Skills (6)

1. Dribbling
2. Passing
3. Defending
4. Finishing
5. Goalkeeping
6. Conditioning

### Trend Calculation

Based on last 3 history entries:
- **Improving:** Average > first level + 0.3
- **Declining:** Average < first level - 0.3
- **Steady:** Otherwise

---

## 11. Goals System

```typescript
interface Goal {
  id: string;
  athleteId: string;
  title: string;
  description?: string;
  targetDate?: string;
  progress: number;            // 0-100
  milestones: GoalMilestone[];
  status: 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
  createdBy: 'COACH' | 'ATHLETE' | 'PARENT';
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

interface GoalMilestone {
  id: string;
  title: string;
  isCompleted: boolean;
  completedAt?: string;
}
```

---

## 12. Session Feedback Integration

```typescript
interface SessionFeedback {
  id: string;
  sessionId: string;
  coachId: string;
  athleteId: string;

  // Private (coach only)
  privateNotes?: string;

  // Shared
  publicSummary: string;
  skillsWorkedOn: string[];
  skillRatings: SkillRating[];
  improvements: string;
  homework: string;
  effortRating: number;        // 1-5
  overallPerformance: number;  // 1-5
  videoClipUrls?: string[];
  badgeAwarded?: string;

  visibility: 'coach_only' | 'parent' | 'athlete';
}
```

---

## 13. Social Feed Integration

### Automatic Achievement Posts

When badge awarded with `visibility !== 'coach_only'`:

```typescript
// Created automatically
{
  postType: 'achievement',
  title: `${athleteName} earned a badge!`,
  body: `Congratulations to ${athleteName} for earning the "${badgeLabel}" badge!`,
  athleteId: athleteId,
  badgeAwardId: awardId,
  coachId: coachId,
}
```

Posts created in **all clubs** the athlete belongs to.

### Manual Sharing

Athletes can share badges to feed via badge screen:
1. View badge in `/badges`
2. Click "Share" button
3. Creates feed post if not already created
4. Sets `shared: true` on award

---

## 14. Notifications

### Badge Notification to Parent

```typescript
{
  type: 'badge',
  title: `${athleteName} earned a badge!`,
  body: `${athleteName} earned the ${badgeLabel} badge from Coach ${coachName}`,
  badgeTitle: badgeLabel,
  athleteName: athleteName,
  badgeAwardId: awardId,
  actionLabel: 'View Badge',
}
```

---

## 15. Mock Data

### Existing Badge Awards (6)

| Athlete | Badge | Coach | Visibility |
|---------|-------|-------|------------|
| Tom Henderson | Best Training Session | Sarah Mitchell | supporters |
| Emma Henderson | Master Passer | David Roberts | athlete |
| James Wilson | Sharp Shooter Pro | Mike Thompson | supporters |
| Tom Henderson | Team Captain | Sarah Mitchell | athlete |
| Tom Henderson | Growth Mindset | Sarah Mitchell | athlete |
| Emma Henderson | Team Player | David Roberts | athlete |

### Mock Progression

| Athlete | Sessions | Streak | Estimated Points |
|---------|----------|--------|------------------|
| Tom Henderson | 47 | 6 weeks | 45 pts |
| Emma Henderson | 12 | 3 weeks | 35 pts |
| James Wilson | 8 | 2 weeks | 50 pts |

---

## 16. Implementation Status

### Fully Implemented

- Badge catalog (15 badges)
- Badge awarding with cooldown
- Award storage and retrieval
- Visibility settings
- Point calculation
- Level system (5 levels)
- Category milestone tracking
- Badge display screens
- Badge grid/card components
- Parent badge viewing
- Unseen badge tracking
- Mark as read functionality
- Badge notifications
- Achievement feed posts
- Session feedback forms
- Skill tracking

### Partially Implemented

- Milestone badges (defined, not auto-awarded)
- Special event badges (defined, not triggered)
- Coach badge distribution analytics

### Not Implemented

- Automatic milestone detection
- Automatic streak detection
- Leaderboards
- Coach verification badges
- Badge presets customization
- Badge level requirements (prerequisites)
- Parent notification opt-out
- Badge expiration
- Badge revocation
- Multi-language support

---

## 17. Files Reference

### Services
- `/services/badge-service.ts`
- `/services/progress-service.ts`
- `/services/social-feed-service.ts`
- `/services/notification-service.ts`

### Components
- `/components/badges/badge-award-modal.tsx`
- `/components/badges/badge-card.tsx`
- `/components/badges/badge-grid.tsx`

### Screens
- `/app/(tabs)/badges.tsx`
- `/app/children/badges/[childId].tsx`
- `/app/development/child-progress/[childId].tsx`

### Types
- `/constants/types.ts` - BadgeDefinition, BadgeAward
- `/constants/progression.ts` - Level thresholds, milestones

### Mock Data
- `/constants/mock-data.ts` - badgeCatalog, badgeAwards
