# Badges & Achievements System

> Complete documentation for the badge catalog, awarding system, progression levels, and social sharing.

---

## Overview

The badge system enables coaches to recognize athlete achievements through:
- 15 categorized badges with point values
- Cooldown system to prevent badge inflation
- Visibility controls for sharing
- Progression levels based on total points
- Automatic feed posts for achievements

---

## Feature Summary

| Feature | Status | Description |
|---------|--------|-------------|
| Badge Catalog | Complete | 15 badges across 6 categories |
| Badge Awarding | Complete | Coach awards with cooldown |
| Progression Levels | Complete | 5 levels based on points |
| Visibility Controls | Complete | Coach-only, athlete, supporters |
| Feed Integration | Complete | Auto-post achievements |
| Milestone Badges | Defined | Auto-award (not implemented) |

---

## Screens & Routes

| Screen | Route | Purpose |
|--------|-------|---------|
| My Badges | `/(tabs)/badges` | Athlete's badge collection |
| Child Badges | `/children/badges/[childId]` | Parent viewing child |
| Child Progress | `/development/child-progress/[childId]` | Progress with badges tab |
| Badge Award Modal | Component | Coach awards badge |

---

## Badge Categories

### 6 Core Categories

| Category | Icon | Description | Example Badges |
|----------|------|-------------|----------------|
| **Leadership** | 👥 | Team leadership | Team Captain, Vocal Leader, Mentor |
| **Consistency** | 🔄 | Reliable attendance | Best Training, Streak Starter, Dedicated |
| **Technique** | ⚽ | Technical skills | Master Passer, Sharp Shooter, First Touch |
| **Mindset** | 💡 | Mental approach | Growth Mindset, Laser Focus |
| **Teamwork** | 🤝 | Collaboration | Team Player, Assist King |
| **Resilience** | 💪 | Bouncing back | Comeback Kid, Never Give Up |

---

## Complete Badge Catalog

### Badge Tiers & Points

| Tier | Name | Points | Color |
|------|------|--------|-------|
| 1 | Bronze | 10 pts | Bronze |
| 2 | Silver | 25 pts | Silver |
| 3 | Gold | 50 pts | Gold |

### All 15 Badges

#### Consistency Badges

| ID | Name | Tier | Points | Description |
|----|------|------|--------|-------------|
| `badge_best_training` | Best Training Session | 1 | 10 | Standout session with effort and focus |
| `badge_streak_starter` | Streak Starter | 1 | 10 | 3 sessions in a row without missing |
| `badge_dedicated_athlete` | Dedicated Athlete | 2 | 25 | Perfect attendance for a month |

#### Technique Badges

| ID | Name | Tier | Points | Description |
|----|------|------|--------|-------------|
| `badge_first_touch` | Silky First Touch | 1 | 10 | Excellent ball control in tight spaces |
| `badge_master_passer` | Master Passer | 2 | 25 | Reliable build-up play and vision |
| `badge_sharp_shooter_pro` | Sharp Shooter Pro | 3 | 50 | Clinical finishing under pressure |

#### Leadership Badges

| ID | Name | Tier | Points | Description |
|----|------|------|--------|-------------|
| `badge_vocal_leader` | Vocal Leader | 1 | 10 | Communicated well and organized group |
| `badge_team_captain` | Team Captain | 2 | 25 | Led drills and encouraged teammates |
| `badge_mentor` | Mentor | 3 | 50 | Helped younger players improve |

#### Mindset Badges

| ID | Name | Tier | Points | Description |
|----|------|------|--------|-------------|
| `badge_growth_mindset` | Growth Mindset | 1 | 10 | Embraced challenges, learned from mistakes |
| `badge_focused_athlete` | Laser Focus | 2 | 25 | Maintained concentration throughout |

#### Teamwork Badges

| ID | Name | Tier | Points | Description |
|----|------|------|--------|-------------|
| `badge_team_player` | Team Player | 1 | 10 | Put team first and supported others |
| `badge_assist_king` | Assist King | 2 | 25 | Created multiple scoring opportunities |

#### Resilience Badges

| ID | Name | Tier | Points | Description |
|----|------|------|--------|-------------|
| `badge_comeback_kid` | Comeback Kid | 2 | 25 | Bounced back from setbacks |
| `badge_never_give_up` | Never Give Up | 3 | 50 | Incredible perseverance under pressure |

---

## Badge Award Flow

### Award Modal UI

```
┌─────────────────────────────────────────────────────────────────┐
│              🏆 Award Badge to Tom Henderson                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   SELECT BADGE                                                  │
│   ─────────────────────────────────────────────────────         │
│   [Best Training Session                              ▼]        │
│                                                                 │
│   REASON (Category)                                             │
│   ─────────────────────────────────────────────────────         │
│   ○ Leadership   ○ Consistency   ● Technique                    │
│   ○ Mindset      ○ Teamwork      ○ Resilience                   │
│                                                                 │
│   QUICK PRESETS                                                 │
│   ─────────────────────────────────────────────────────         │
│   [Lead the pod] [Resilience] [Team-first]                      │
│   [Consistency] [Growth mindset] [Technical focus]              │
│                                                                 │
│   NOTE TO PARENT                                                │
│   ─────────────────────────────────────────────────────         │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ Great effort today! Tom kept his energy up throughout   │  │
│   │ the session and showed real improvement...              │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│   VISIBILITY                                                    │
│   ─────────────────────────────────────────────────────         │
│   👁️ [Supporters                                     ▼]        │
│                                                                 │
│   ⚠️ COOLDOWN: 7 days between badges per athlete               │
│   [ ] Exception (requires additional note)                      │
│                                                                 │
│              [Cancel]            [Award Badge]                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Award Presets

| Preset | Badge | Auto-Note |
|--------|-------|-----------|
| Lead the pod | Leadership | "Set the tempo for the group today..." |
| Resilience under pressure | Sharp Shooter | "Bounced back after early mistakes..." |
| Team-first play | Master Passer | "Created chances for others..." |
| Week-on-week consistency | Any | "Showed up early, stayed locked in..." |
| Growth mindset | Growth Mindset | "Took coaching points on quickly..." |
| Technical focus | Any | "Clean first touch and quality release..." |

### Cooldown System

- **Window:** 7 days between badges per athlete per coach
- **Exception:** Can bypass with toggle + mandatory reason
- **Display:** Shows days remaining if in cooldown

```typescript
function canAwardBadge(coachId: string, athleteId: string): CooldownResult {
  const lastAward = getLastBadgeAward(coachId, athleteId);

  if (!lastAward) return { canAward: true };

  const daysSince = getDaysSince(lastAward.awardedAt);

  if (daysSince >= 7) return { canAward: true };

  return {
    canAward: false,
    daysRemaining: 7 - daysSince,
    canOverride: true
  };
}
```

---

## Data Models

### Badge Definition

```typescript
interface BadgeDefinition {
  id: string;                       // "badge_best_training"
  label: string;                    // "Best Training Session"
  description: string;              // Full description
  category: BadgeCategory;          // "Consistency"
  tier: 1 | 2 | 3;                 // Bronze/Silver/Gold
  pointValue: number;              // 10, 25, or 50
  icon?: string;                   // Icon name
  tone: 'success' | 'warning' | 'default';
}
```

### Badge Award

```typescript
interface BadgeAward {
  id: string;
  badgeId: string;
  badgeLabel: string;
  badgeCategory?: BadgeCategory;
  badgeTier?: 1 | 2 | 3;
  badgePointValue?: number;

  // Recipient
  athleteId: string;
  athleteName?: string;

  // Awarder
  coachId: string;
  coachName?: string;
  awardedAt: string;

  // Context
  sessionId?: string;              // If awarded during session
  reason: string;                  // Category/reason
  note?: string;                   // Personal note
  presetId?: string;               // If using preset

  // Cooldown
  cooldownBypassed?: boolean;
  overrideNote?: string;

  // Visibility
  visibility: BadgeVisibility;
  shared?: boolean;                // If shared to feed
  feedPostId?: string;             // Link to feed post

  // Parent Tracking
  seenByParent?: boolean;
  seenAt?: string;
}

type BadgeVisibility = 'coach_only' | 'athlete' | 'supporters';
```

---

## Visibility Levels

| Level | Coach | Athlete | Parent | Feed Post | Notification |
|-------|-------|---------|--------|-----------|--------------|
| `coach_only` | ✓ | ✗ | ✗ | ✗ | ✗ |
| `athlete` | ✓ | ✓ | ✗ | Optional | ✗ |
| `supporters` | ✓ | ✓ | ✓ | Auto | ✓ |

### Visibility Flow

```
Coach awards badge
        │
        ▼
visibility !== 'coach_only'?
        │
   ┌────┴────┐
   │ YES     │ NO
   ▼         ▼
Create     Coach only
feed post  can view
   │
   ▼
Send parent
notification
```

---

## Progression System

### Levels (5 Total)

| Level | Name | Points Required | Badge |
|-------|------|-----------------|-------|
| 1 | Beginner | 0 | ⚪ |
| 2 | Developing | 50 | 🟤 |
| 3 | Intermediate | 150 | ⚪ |
| 4 | Advanced | 300 | 🟡 |
| 5 | Elite | 500 | 🏆 |

### Level Calculation

```typescript
function calculateLevel(totalPoints: number): ProgressionLevel {
  const levels = [
    { level: 5, name: 'Elite', minPoints: 500 },
    { level: 4, name: 'Advanced', minPoints: 300 },
    { level: 3, name: 'Intermediate', minPoints: 150 },
    { level: 2, name: 'Developing', minPoints: 50 },
    { level: 1, name: 'Beginner', minPoints: 0 },
  ];

  for (const l of levels) {
    if (totalPoints >= l.minPoints) return l;
  }

  return levels[4]; // Beginner
}
```

### Progress Display

```
┌─────────────────────────────────────────────────────────────────┐
│   Level 2: Developing                                           │
│   ████████████████░░░░░░░░░░░░░░░░░░░░░░  75/150 pts           │
│                                                                 │
│   75 pts to Intermediate                                        │
└─────────────────────────────────────────────────────────────────┘
```

### Category Milestones

Each category tracks progress separately:

| Milestone | Badges Required | Icon |
|-----------|-----------------|------|
| None | 0-2 | - |
| Bronze | 3-6 | 🥉 |
| Silver | 7-14 | 🥈 |
| Gold | 15+ | 🥇 |

---

## Milestone Badges (Automatic)

### Session Milestones

| ID | Name | Tier | Points | Requirement |
|----|------|------|--------|-------------|
| `milestone_5_sessions` | First Five | 1 | 10 | 5 sessions |
| `milestone_10_sessions` | Double Digits | 1 | 15 | 10 sessions |
| `milestone_25_sessions` | Quarter Century | 2 | 25 | 25 sessions |
| `milestone_50_sessions` | Half Century | 2 | 35 | 50 sessions |
| `milestone_100_sessions` | Century Club | 3 | 50 | 100 sessions |

### Streak Milestones

| ID | Name | Tier | Points | Requirement |
|----|------|------|--------|-------------|
| `streak_2_weeks` | Getting Started | 1 | 10 | 2 consecutive weeks |
| `streak_4_weeks` | Monthly Momentum | 1 | 15 | 4 consecutive weeks |
| `streak_8_weeks` | Two Month Warrior | 2 | 25 | 8 consecutive weeks |
| `streak_12_weeks` | Quarter Year Champion | 3 | 50 | 12 consecutive weeks |

**Note:** Milestone badges are defined but automatic detection is not implemented.

---

## Feed Integration

### Automatic Achievement Posts

When badge is awarded with `visibility !== 'coach_only'`:

```typescript
const feedPost = {
  postType: 'achievement',
  title: `${athleteName} earned a badge!`,
  body: `Congratulations to ${athleteName} for earning the "${badgeLabel}" badge!`,
  athleteId,
  badgeAwardId: awardId,
  coachId,
  clubIds: athleteClubIds, // Posted to all athlete's clubs
};
```

### Manual Sharing

Athletes can share badges to feed:

1. View badge in `/badges`
2. Click "Share" button
3. Creates feed post if not already created
4. Sets `shared: true` on award

---

## Notifications

### Parent Badge Notification

```typescript
{
  type: 'badge',
  title: `${athleteName} earned a badge!`,
  body: `${athleteName} earned the ${badgeLabel} badge from Coach ${coachName}`,
  badgeTitle: badgeLabel,
  athleteName,
  badgeAwardId: awardId,
  actionLabel: 'View Badge',
}
```

---

## Services

### badge-service.ts

```typescript
class BadgeService {
  // Catalog
  getBadgeCatalog(): Promise<BadgeDefinition[]>
  getBadgesByCategory(category: BadgeCategory): Promise<BadgeDefinition[]>

  // Awards
  awardBadge(params: AwardBadgeParams): Promise<BadgeAward>
  getAthleteBadges(athleteId: string): Promise<BadgeAward[]>
  getUnseenBadges(athleteId: string): Promise<BadgeAward[]>
  markBadgeSeen(awardId: string): Promise<void>

  // Cooldown
  checkCooldown(coachId: string, athleteId: string): Promise<CooldownResult>

  // Progression
  calculateProgression(athleteId: string): Promise<ProgressionData>
  getCategoryProgress(athleteId: string): Promise<CategoryProgress[]>
}
```

---

## Components

### Badge Components

| Component | Path | Purpose |
|-----------|------|---------|
| `badge-award-modal` | `/components/badges/badge-award-modal.tsx` | Award interface |
| `badge-card` | `/components/badges/badge-card.tsx` | Badge display |
| `badge-grid` | `/components/badges/badge-grid.tsx` | Collection grid |

---

## Storage Keys

| Key | Purpose |
|-----|---------|
| `clubroom.badge_awards` | All badge awards |
| `badge_cooldowns` | Cooldown tracking |

---

## API Contracts

### Badge Endpoints

```typescript
// Get badge catalog
GET /badges
Query: { category? }
Response: BadgeDefinition[]

// Get athlete badges
GET /athletes/:athleteId/badges
Response: BadgeAward[]

// Award badge
POST /athletes/:athleteId/badges
Body: { badgeId, reason?, sessionId? }
Response: BadgeAward

// Get progression
GET /athletes/:athleteId/progression
Response: { level, totalPoints, categoryProgress[] }
```

---

## Files Reference

### Services
- `/services/badge-service.ts`
- `/services/notification-service.ts`
- `/services/social-feed-service.ts`

### Screens
- `/app/(tabs)/badges.tsx`
- `/app/children/badges/[childId].tsx`
- `/app/development/child-progress/[childId].tsx`

### Components
- `/components/badges/badge-award-modal.tsx`
- `/components/badges/badge-card.tsx`
- `/components/badges/badge-grid.tsx`

### Constants
- `/constants/progression.ts` - Level thresholds, milestones
- `/constants/mock-data.ts` - Badge catalog, awards
