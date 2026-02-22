# Progress Architecture — All Gaps Fixed

**This file is THE source of truth for types, decisions, storage, integration patterns, and wiring. Every sprint doc references this. If a sprint doc contradicts this file, THIS FILE WINS.**

---

## 1. DECISIONS (Every Ambiguity Resolved)

### D1. FA Four Corners = Technical, Physical, Psychological, SOCIAL

The existing `BadgeCategory` type (from `constants/user-types.ts`) is:
```typescript
type BadgeCategory = 'technical' | 'physical' | 'psychological' | 'social';
```

The existing `CategoryInfo` (from `constants/progression.ts`) is:
```typescript
export const CategoryInfo: Record<BadgeCategory, { label: string; icon: string }> = {
  technical: { label: 'Technical', icon: 'football' },
  physical: { label: 'Physical', icon: 'fitness' },
  psychological: { label: 'Psychological', icon: 'bulb' },
  social: { label: 'Social', icon: 'people' },
};
```

**DECISION:** Use `social`, NOT `tactical`. The FA Four Corner Model is Technical/Physical/Psychological/Social. All sprint docs that say "tactical" should read "social". The four-corner-mapping.ts will use `BadgeCategory` type directly. Social includes: Positioning, Decision-Making, Vision, Awareness, Communication, Leadership, Teamwork.

### D2. Pager Library = FlatList with pagingEnabled

**DECISION:** Use `FlatList` with `pagingEnabled={true}` and `snapToAlignment="center"`. NOT `react-native-pager-view`. Reason: one less dependency, FlatList is battle-tested, same visual result.

Accessibility: Add prev/next buttons below the pager for VoiceOver/TalkBack users.

### D3. Challenge Service Naming

Existing `services/challenge-service.ts` is for **squad video challenges** (completely different concept).

**DECISION:** Name the new service `services/progress/progress-challenge-service.ts`. Type: `ProgressChallenge` (not `Challenge`). Storage keys: `PROGRESS_ACTIVE_CHALLENGE`, `PROGRESS_CHALLENGE_HISTORY`. This avoids ALL naming conflicts.

### D4. Progression Levels = 5 (Not 10)

Existing `ProgressionThresholds.levels` (from `constants/progression.ts`):
```typescript
[
  { level: 1, name: 'Starting Out', pointsRequired: 0 },
  { level: 2, name: 'Progressing', pointsRequired: 50 },
  { level: 3, name: 'Established', pointsRequired: 150 },
  { level: 4, name: 'Advanced', pointsRequired: 300 },
  { level: 5, name: 'Elite', pointsRequired: 500 },
]
```

**DECISION:** Use existing 5 levels. Player card tiers:

| Level | Tier | Card Style |
|-------|------|-----------|
| 1 | Bronze | `#8B6914` → `#CD7F32` |
| 2 | Silver | `#71706E` → `#C0C0C0` |
| 3 | Gold | `#B8860B` → `#FFD700` |
| 4 | Platinum | `#1A1A2E` → `#4A90D9` |
| 5 | Diamond | `#0F0F23` → `#E040FB` |

These are intentionally hardcoded (like confetti colours in `celebration-overlay.tsx`). They're brand colours for card tiers, not theme tokens.

### D5. media-service.ts = NEW File

`services/media-service.ts` does NOT exist. All sprints that say "MODIFY" should say "NEW" in Sprint 0, then "MODIFY" in Sprint 2+.

### D6. Group Completion Mode

**DECISION:** Quick Rate step is SKIPPED in group completion board mode (`isGroupCompletion === true`). Group board is for fast batch attendance. Quick Rate only appears in the regular step-by-step wizard. Camera/badge shortcuts also skipped in group mode.

### D7. Skip All Destination

**DECISION:** "Skip All" on Quick Rate step calls `goToNextStep()` — advances to the Notes step. No ratings saved. Existing skill levels remain unchanged.

### D8. Effort Field

**DECISION:** Quick Rate `effort` is the SAME field as `AthleteAttendance.effort`. When Quick Rate step loads, pre-fill effort from attendance step if already set. When Quick Rate saves, write back to `AthleteAttendance.effort`. One source of truth.

### D9. Web Platform Camera Fallback

**DECISION:** On web (`Platform.OS === 'web'`), replace camera buttons with `expo-image-picker` (already installed). `launchImageLibraryAsync()` for photos, disable video recording. Show "Video recording available on mobile" message.

### D10. Max Media Limits

**DECISION:** Max 3 photos + 1 video per athlete per session. Enforced in `use-session-media.ts` hook. When limit reached: button greys out + shows count "3/3". Tap shows toast "Maximum 3 photos per session".

### D11. Four Corners Pre-fill Source

**DECISION:** Store corner ratings on each `SessionFeedback` record. Add `fourCorners` optional field to `SessionFeedback` type. Pre-fill reads most recent feedback for this athlete+coach pair.

### D12. What Happens to Existing Components

| Component | Action | Reason |
|-----------|--------|--------|
| `progress-dashboard.tsx` | KEEP | Used as composition root, insert MomentHero at top |
| `progress-overview-card.tsx` | KEEP | Still renders level + stats below MomentHero |
| `progress-level-banner.tsx` | DELETE import from my-progress.tsx | Redundant with overview card |
| `skill-level-grid.tsx` | MODIFY | Change category labels to FA Four Corners |
| `skill-radar.tsx` | KEEP | Add previous-month ghost overlay |
| `progress-goals-tab.tsx` | MODIFY | Add "Set by" label, add challenge card at top |
| `progress-badges-tab.tsx` | REWRITE | Change from list to grid layout |
| `session-feedback-card.tsx` | MODIFY | Add media strip, coach qualification badge |
| `session-journal.tsx` | MODIFY | Add contextual mood prompt at top |
| `celebration-overlay.tsx` | MODIFY | Wire to badge/level events |

### D13. use-my-progress.ts Data Loading Pattern

**DECISION:** Single `useScreen` load function fetches everything. New data sources loaded inside the existing `loadData` callback via `Promise.all`. Individual computation hooks (`useFourCorners`, `useProgressMoment`) are PURE — they take data as params, no async, no side effects.

```typescript
// Pattern
const loadData = useCallback(async () => {
  const [progressData, feedbackData, badgesData, allBadgesData, streakData, challengeData] =
    await Promise.all([
      progressService.getAthleteProgress(athleteId, viewerRole),
      progressService.getFeedbackForAthlete(athleteId, viewerRole),
      badgeService.listAwardsForAthlete(athleteId),
      badgeService.getAllBadgesWithProgress(athleteId),
      badgeService.getStreakInfo(athleteId),
      progressChallengeService.getActiveChallenge(athleteId),
    ]);

  return ok({ progress: progressData, feedback: feedbackData, /* etc */ });
}, [athleteId, viewerRole]);

// Pure computation hooks (no async)
const fourCorners = useFourCorners(data?.progress?.skills ?? []);
const moment = useProgressMoment(data, isParentContext);
const monthSummary = useMonthSummary(data);
```

---

## 2. TYPE DEFINITIONS (Every Missing Type)

All types go in existing files where possible. New types go in `types/progress-types.ts` (NEW file).

### types/progress-types.ts (NEW)

```typescript
import type { BadgeCategory } from '@/constants/user-types';

// ─── Quick Rate ───

export interface QuickRateInput {
  athleteId: string;
  athleteName: string;
  sessionId: string;
  coachId: string;
  technical: number;      // 1-5 dots
  physical: number;       // 1-5 dots
  psychological: number;  // 1-5 dots
  social: number;         // 1-5 dots (NOT tactical)
  effort: number;         // 1-5
  mediaIds?: string[];
  badgeId?: string;
}

export type FourCornerKey = BadgeCategory; // 'technical' | 'physical' | 'psychological' | 'social'

export interface FourCornerRatings {
  technical: number;      // 1-5
  physical: number;       // 1-5
  psychological: number;  // 1-5
  social: number;         // 1-5
}

export interface FourCornerDisplay {
  key: FourCornerKey;
  label: string;
  icon: string;
  value: number;          // 0-100 (average of skills in corner, mapped from 1-10 → 10-100)
  skillCount: number;
  color: string;
}

// ─── Media ───

export interface PhotoAsset {
  uri: string;
  thumbnailUri: string;
  width: number;
  height: number;
  capturedAt: string;
}

export interface VideoAsset {
  uri: string;
  thumbnailUri: string;
  duration: number;       // seconds
  capturedAt: string;
}

export interface SessionMedia {
  sessionId: string;
  athleteId: string;
  coachId: string;
  photos: PhotoAsset[];
  video: VideoAsset | null;
  createdAt: string;
}

// ─── Moment Hero ───

export type MomentType =
  | 'feedback_received'
  | 'media_captured'
  | 'badge_earned'
  | 'goal_completed'
  | 'challenge_completed'
  | 'streak_milestone'
  | 'skill_level_up'
  | 'session_upcoming'
  | 'streak_active'
  | 'welcome';

export interface MomentData {
  type: MomentType;
  feedback?: import('@/services/progress-service').SessionFeedback;
  badge?: import('@/constants/types').BadgeAward;
  goal?: import('@/constants/types').Goal;
  media?: PhotoAsset[];
  streakWeeks: number;
  nextStreakMilestone: number;
  currentLevel: { level: number; name: string };
  progressToNextLevel: number;
  nextSession?: { date: string; coachName: string };
}

// ─── Progress Challenge ───

export type ProgressChallengeType =
  | 'attendance'
  | 'streak'
  | 'skill'
  | 'badge_collection'
  | 'journal'
  | 'improvement';

export interface ProgressChallenge {
  id: string;
  athleteId: string;
  type: ProgressChallengeType;
  title: string;
  description: string;
  targetValue: number;
  currentValue: number;
  progress: number;         // 0-100 computed
  rewardBadgeId: string;
  rewardLabel: string;
  status: 'active' | 'completed' | 'expired';
  assignedAt: string;
  expiresAt: string;
  completedAt?: string;
}

// ─── Past Sessions ───

export interface PastSession {
  sessionId: string;
  feedbackId?: string;
  date: string;
  coachName: string;
  coachQualification?: string;
  corners: FourCornerRatings | null;
  effort: number;
  summary: string;            // publicSummary, truncated to 120 chars
  performance: number;        // 1-5
  photos: PhotoAsset[];
  video: VideoAsset | null;
  badgeAwarded?: { label: string; category?: string };
}

// ─── Month Summary ───

export interface MonthSummary {
  sessionsAttended: number;
  feedbackCount: number;
  skillsImproved: number;
  goalsCompleted: number;
  badgesEarned: number;
  photosCount: number;
  videosCount: number;
}

// ─── Player Card ───

export type CardTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export interface PlayerCardData {
  name: string;
  levelNumber: number;
  levelName: string;
  tier: CardTier;
  corners: {
    technical: number;    // FIFA score 1-99
    physical: number;
    psychological: number;
    social: number;
  };
  memberSince: string;
  streakWeeks: number;
  totalSessions: number;
  totalBadges: number;
  bestSkill: { name: string; level: number } | null;
  mostImproved: { name: string; changePercent: number } | null;
  latestPhotoUri: string | null;
}
```

### SessionFeedback Extension

Add `fourCorners` to existing `SessionFeedback` in `services/progress/progress-feedback-service.ts`:

```typescript
export interface SessionFeedback {
  // ... all existing fields unchanged ...

  // NEW: Four Corner ratings from Quick Rate (optional — only present if Quick Rate was used)
  fourCorners?: {
    technical: number;      // 1-5
    physical: number;       // 1-5
    psychological: number;  // 1-5
    social: number;         // 1-5
  };
}
```

### CompletionStep Extension

In `hooks/use-session-completion.ts`, change:

```typescript
// BEFORE
export type CompletionStep = 'attendance' | 'notes' | 'badges' | 'summary';
export const COMPLETION_STEPS: CompletionStep[] = ['attendance', 'notes', 'badges', 'summary'];

// AFTER
export type CompletionStep = 'attendance' | 'quickRate' | 'notes' | 'badges' | 'summary';
export const COMPLETION_STEPS: CompletionStep[] = ['attendance', 'quickRate', 'notes', 'badges', 'summary'];
```

When `isGroupCompletion === true`, filter out `'quickRate'`:
```typescript
const activeSteps = isGroupCompletion
  ? COMPLETION_STEPS.filter(s => s !== 'quickRate')
  : COMPLETION_STEPS;
```

---

## 3. STORAGE SCHEMAS

### SESSION_MEDIA (NEW)

```typescript
// Key: STORAGE_KEYS.SESSION_MEDIA = 'clubroom.session_media'
// Structure: SessionMedia[] (flat array, filter by sessionId+athleteId)
// Why flat array: consistent with SESSION_FEEDBACK, BADGE_AWARDS patterns
```

### PROGRESS_ACTIVE_CHALLENGE (NEW)

```typescript
// Key: STORAGE_KEYS.PROGRESS_ACTIVE_CHALLENGE = 'progress.active_challenge'
// Structure: Record<athleteId, ProgressChallenge>
// One active challenge per athlete
```

### PROGRESS_CHALLENGE_HISTORY (NEW)

```typescript
// Key: STORAGE_KEYS.PROGRESS_CHALLENGE_HISTORY = 'progress.challenge_history'
// Structure: ProgressChallenge[] (flat array, filter by athleteId)
```

### HOMEWORK_COMPLETION (NEW)

```typescript
// Key: STORAGE_KEYS.HOMEWORK_COMPLETION = 'progress.homework_completion'
// Structure: Record<feedbackId, { completedAt: string }>
```

### Existing Keys Used (No Changes)

```typescript
SKILL_LEVELS: 'progress.skill_levels'        // AthleteSkillLevels
SESSION_FEEDBACK: 'progress.session_feedback' // SessionFeedback[]
GOALS: 'progress.goals'                      // Goal[]
BADGE_AWARDS: 'clubroom.badge_awards'         // BadgeAward[]
SESSION_NOTES: 'progress.session_notes'       // Record<bookingId, SessionNoteRecord>
SESSION_JOURNAL: 'clubroom.session_journal'   // JournalEntry[]
```

---

## 4. EVENT BUS ADDITIONS

Add to `services/event-bus.ts` ServiceEvents object:

```typescript
// Progress events (NEW)
SESSION_MEDIA_CAPTURED: 'session:media_captured',
SKILL_LEVEL_UP: 'progress:skill_level_up',
LEVEL_UP: 'progress:level_up',
PROGRESS_CHALLENGE_COMPLETED: 'progress:challenge_completed',
PROGRESS_CHALLENGE_ASSIGNED: 'progress:challenge_assigned',
JOURNAL_SAVED: 'journal:saved',
```

Add to `TypedEventMap`:

```typescript
[ServiceEvents.SESSION_MEDIA_CAPTURED]: {
  sessionId: string;
  athleteId: string;
  photoCount: number;
  hasVideo: boolean;
};

[ServiceEvents.SKILL_LEVEL_UP]: {
  athleteId: string;
  skill: string;
  previousLevel: number;
  newLevel: number;
  corner: BadgeCategory;
};

[ServiceEvents.LEVEL_UP]: {
  userId: string;
  previousLevel: number;
  newLevel: number;
  newLevelName: string;
};

[ServiceEvents.PROGRESS_CHALLENGE_COMPLETED]: {
  challengeId: string;
  athleteId: string;
  type: ProgressChallengeType;
  rewardBadgeId: string;
};

[ServiceEvents.PROGRESS_CHALLENGE_ASSIGNED]: {
  challengeId: string;
  athleteId: string;
  type: ProgressChallengeType;
};

[ServiceEvents.JOURNAL_SAVED]: {
  athleteId: string;
  sessionId?: string;
  entryId: string;
};
```

---

## 5. FOUR CORNER SKILL MAPPING

### constants/four-corner-mapping.ts (NEW)

```typescript
import type { BadgeCategory } from '@/constants/user-types';

/**
 * Maps skill names to FA Four Corner categories.
 * Used by Quick Rate to distribute corner ratings to individual skills,
 * and by Four Corner Diamond to compute corner averages.
 *
 * Matching is case-insensitive substring. "Ball Control" matches "control" in Technical.
 */
export const FOUR_CORNER_SKILLS: Record<BadgeCategory, string[]> = {
  technical: [
    'First Touch', 'Passing', 'Dribbling', 'Shooting',
    'Finishing', 'Crossing', 'Heading', 'Ball Control',
    'Set Pieces', 'Weak Foot',
  ],
  physical: [
    'Speed', 'Agility', 'Stamina', 'Strength',
    'Conditioning', 'Endurance', 'Power', 'Flexibility',
    'Balance', 'Coordination',
  ],
  psychological: [
    'Focus', 'Confidence', 'Resilience', 'Composure',
    'Coachability', 'Mindset', 'Growth Mindset', 'Motivation',
    'Discipline', 'Sportsmanship',
  ],
  social: [
    'Positioning', 'Decision-Making', 'Vision', 'Awareness',
    'Game Reading', 'Communication', 'Leadership', 'Teamwork',
    'Pressing', 'Spatial Awareness',
  ],
};

/**
 * Default skills created when an athlete has NO skill records.
 * 4 per corner = 16 total.
 */
export const DEFAULT_SKILLS: Record<BadgeCategory, string[]> = {
  technical: ['First Touch', 'Passing', 'Dribbling', 'Shooting'],
  physical: ['Speed', 'Stamina', 'Agility', 'Strength'],
  psychological: ['Focus', 'Confidence', 'Resilience', 'Composure'],
  social: ['Positioning', 'Decision-Making', 'Vision', 'Awareness'],
};

/**
 * Visual config per corner (reuses existing CategoryInfo pattern).
 */
export const CORNER_COLORS: Record<BadgeCategory, string> = {
  technical: '#10B981',
  physical: '#3B82F6',
  psychological: '#F59E0B',
  social: '#8B5CF6',
};

/**
 * Classify a skill name into a corner category.
 * Returns 'technical' as fallback if no match.
 */
export function classifySkill(skillName: string): BadgeCategory {
  const lower = skillName.toLowerCase();
  for (const [category, skills] of Object.entries(FOUR_CORNER_SKILLS)) {
    if (skills.some(s => lower.includes(s.toLowerCase()))) {
      return category as BadgeCategory;
    }
  }
  return 'technical'; // fallback
}
```

---

## 6. SERVICE METHOD SPECS

### bulkUpdateFromQuickRate (progress-skills-service.ts)

```typescript
/**
 * Update all skills for an athlete from Quick Rate corner ratings.
 *
 * Logic:
 * 1. Get athlete's existing skills (or create defaults if none exist)
 * 2. For each corner, map 1-5 dots → skill level (dots × 2 = level 2/4/6/8/10)
 * 3. Classify each existing skill into a corner using classifySkill()
 * 4. Update all skills in that corner to the new level
 * 5. Store the corner ratings on the feedback record for pre-fill next time
 */
async bulkUpdateFromQuickRate(input: QuickRateInput): Promise<Result<SkillLevel[], ServiceError>> {
  const dotToLevel = (dots: number): number => dots * 2; // 1→2, 2→4, 3→6, 4→8, 5→10

  const cornerLevels: Record<BadgeCategory, number> = {
    technical: dotToLevel(input.technical),
    physical: dotToLevel(input.physical),
    psychological: dotToLevel(input.psychological),
    social: dotToLevel(input.social),
  };

  // Get or create skills
  let athleteSkills = await this.getAthleteSkillLevels(input.athleteId);
  if (!athleteSkills || Object.keys(athleteSkills.skills).length === 0) {
    // Create defaults
    const defaults = Object.entries(DEFAULT_SKILLS).flatMap(([corner, skills]) =>
      skills.map(skill => ({ skill, level: cornerLevels[corner as BadgeCategory] }))
    );
    // ... create via updateMultipleSkillLevels
  }

  // Classify and update
  const updates = Object.values(athleteSkills.skills).map(skill => ({
    skill: skill.skill,
    level: cornerLevels[classifySkill(skill.skill)],
  }));

  return this.updateMultipleSkillLevels(input.athleteId, updates, input.coachId);
}
```

### createFeedbackFromQuickRate (progress-feedback-service.ts)

```typescript
/**
 * Create a lightweight SessionFeedback record from Quick Rate data.
 * Called after session completion wizard finishes.
 *
 * Fields populated:
 * - effortRating: from input.effort
 * - overallPerformance: from input.effort (same value — Quick Rate doesn't separate them)
 * - fourCorners: { technical, physical, psychological, social }
 * - skillsWorkedOn: corners where rating differs from previous (detected by service)
 * - publicSummary: auto-generated from changed corners
 * - visibility: 'athlete' (default)
 *
 * Fields left empty (coach fills in via deep link if they want):
 * - improvements: ''
 * - homework: ''
 * - privateNotes: undefined
 * - videoClipUrls: [] (media attached separately via SESSION_MEDIA)
 */
async createFeedbackFromQuickRate(
  input: QuickRateInput,
  coachName: string,
  athleteName: string,
): Promise<Result<SessionFeedback, ServiceError>>
```

### Pre-fill Logic

```typescript
/**
 * Get previous Quick Rate corner values for pre-fill.
 * Reads most recent SessionFeedback with fourCorners set for this athlete+coach pair.
 */
async getPreviousCorners(
  athleteId: string,
  coachId: string,
): Promise<FourCornerRatings | null> {
  const allFeedback = await this.getFeedbackForAthlete(athleteId, 'coach');
  const withCorners = allFeedback
    .filter(f => f.coachId === coachId && f.fourCorners)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return withCorners[0]?.fourCorners ?? null;
}
```

---

## 7. PACKAGE INSTALLATION

### Already Installed (No Action)
```
expo-haptics, expo-image, expo-sharing, expo-file-system,
expo-image-picker, expo-font, expo-location, expo-notifications,
react-native-svg, react-native-reanimated, react-native-gesture-handler,
react-native-confetti-cannon
```

### Need to Install (Run ONCE Before Sprint 0)
```bash
npx expo install expo-camera expo-image-manipulator expo-video-thumbnails expo-av react-native-view-shot
```

### app.json Camera Permission (Add to plugins)
```json
["expo-camera", {
  "cameraPermission": "Allow Clubroom to capture training photos and videos",
  "microphonePermission": "Allow Clubroom to record training videos with audio"
}]
```

---

## 8. WIRING: Celebration Overlay → Events

In `app/development/my-progress.tsx`:

```typescript
import { useRef, useEffect } from 'react';
import { CelebrationOverlay, type CelebrationOverlayRef } from '@/components/celebration-overlay';
import { onTyped, ServiceEvents } from '@/services/event-bus';

const celebrationRef = useRef<CelebrationOverlayRef>(null);

useEffect(() => {
  const unsubs = [
    onTyped(ServiceEvents.BADGE_EARNED, ({ badgeLabel }) => {
      celebrationRef.current?.celebrate({
        title: 'Badge Unlocked!',
        subtitle: badgeLabel ?? 'New achievement',
        icon: 'ribbon',
        iconColor: colors.success,
      });
    }),
    onTyped(ServiceEvents.LEVEL_UP, ({ newLevelName }) => {
      celebrationRef.current?.celebrate({
        title: 'LEVEL UP!',
        subtitle: newLevelName,
        icon: 'trophy',
        iconColor: '#FFD700',
        confettiCount: 200,
        duration: 3000,
      });
    }),
    onTyped(ServiceEvents.PROGRESS_CHALLENGE_COMPLETED, ({ rewardBadgeId }) => {
      celebrationRef.current?.celebrate({
        title: 'Challenge Complete!',
        subtitle: 'Badge earned',
        icon: 'flag',
        iconColor: colors.tint,
      });
    }),
  ];
  return () => unsubs.forEach(fn => fn());
}, [colors]);

// In JSX, AFTER ScrollView:
<CelebrationOverlay ref={celebrationRef} />
```

---

## 9. WIRING: Quick Rate → Session Completion Hook

In `hooks/use-session-completion.ts`, add state:

```typescript
// NEW state for Quick Rate
const [quickRateData, setQuickRateData] = useState<Record<string, QuickRateInput>>({});
// Key = athleteId, Value = their ratings

// Pass to Quick Rate step component
const handleQuickRateUpdate = useCallback((athleteId: string, data: QuickRateInput) => {
  setQuickRateData(prev => ({ ...prev, [athleteId]: data }));
}, []);

// In handleComplete(), AFTER existing save logic:
// Save Quick Rate data for each athlete
for (const [athleteId, rateData] of Object.entries(quickRateData)) {
  await progressSkillsService.bulkUpdateFromQuickRate(rateData);
  await progressFeedbackService.createFeedbackFromQuickRate(
    rateData, currentUser.name, rateData.athleteName
  );
}
```

---

## 10. WIRING: Media Capture → Storage → Display

### Capture Flow (Sprint 0)

```
Coach taps 📷 on Quick Rate card
  → use-session-media.ts hook opens camera
  → expo-camera captures photo
  → expo-image-manipulator resizes to 1080px wide
  → Saves to expo-file-system documentDirectory
  → Generates 200x200 thumbnail
  → Updates hook state: photos.push({ uri, thumbnailUri, width, height, capturedAt })
  → Thumbnail appears on Quick Rate card
```

### Save Flow (Session Completion)

```
Coach completes wizard (handleComplete)
  → For each athlete with media:
    → Create SessionMedia record
    → Save to STORAGE_KEYS.SESSION_MEDIA via apiClient.set()
    → Emit SESSION_MEDIA_CAPTURED event
```

### Display Flow (Sprint 2)

```
Athlete opens My Progress → Past Sessions Timeline
  → use-past-sessions.ts loads:
    → SessionFeedback[] for athlete (existing)
    → SessionMedia[] filtered by athlete (new)
  → Merges by sessionId
  → Renders session-timeline-card with media-strip
```

### Transfer: Media URIs are NOT copied to SessionFeedback

SessionFeedback.videoClipUrls stays empty. Media lives in SESSION_MEDIA storage. Timeline merges them at display time by matching sessionId. This avoids data duplication.

---

## 11. ROUTE PARAMS: Deep Link Pre-fill

### Design

Use `expo-router` search params (NOT complex objects):

```typescript
// Navigation from completion summary
router.push({
  pathname: '/development/session/[sessionId]',
  params: {
    sessionId,
    prefillFromQuickRate: 'true',  // flag
    athleteId,                      // to look up Quick Rate data from storage
  },
});

// In target screen
const { sessionId, prefillFromQuickRate, athleteId } = useLocalSearchParams();

if (prefillFromQuickRate === 'true' && athleteId) {
  // Load Quick Rate data for this athlete from SESSION_FEEDBACK
  // (createFeedbackFromQuickRate already saved it)
  const feedback = await progressFeedbackService.getLatestForAthlete(athleteId, sessionId);
  // Use feedback.fourCorners, feedback.effortRating as initial state
}
```

No complex serialization. The Quick Rate data is already saved to storage by the time the deep link opens. The target screen just reads it.

---

## 12. AUTO-GENERATED SUMMARY TEMPLATE

```typescript
function generateQuickRateSummary(
  corners: FourCornerRatings,
  previousCorners: FourCornerRatings | null,
  attendeeCount: number,
): string {
  const improved: string[] = [];
  const cornerLabels: Record<FourCornerKey, string> = {
    technical: 'technical skills',
    physical: 'physical performance',
    psychological: 'mental game',
    social: 'game awareness',
  };

  if (previousCorners) {
    for (const key of Object.keys(corners) as FourCornerKey[]) {
      if (corners[key] > previousCorners[key]) {
        improved.push(cornerLabels[key]);
      }
    }
  }

  if (improved.length > 0) {
    const list = improved.length === 1
      ? improved[0]
      : `${improved.slice(0, -1).join(', ')} and ${improved[improved.length - 1]}`;
    return `Good progress in ${list} today.`;
  }

  return `Session completed with ${attendeeCount} ${attendeeCount === 1 ? 'athlete' : 'athletes'}.`;
}
```

---

## 13. STREAK: Existing Infrastructure

`badgeService.getStreakInfo(athleteId)` already exists and returns:
```typescript
{ currentStreak: number; nextMilestone: number; daysToNextMilestone: number; streakLabel: string }
```

Currently returns MOCK data. To make it real, replace mock logic with:
```typescript
// Count consecutive weeks with at least 1 attended session
const sessions = await apiClient.get<Session[]>(STORAGE_KEYS.COACH_SESSIONS, []);
const athleteSessions = sessions.filter(s => s.athleteId === athleteId && s.attendance === 'ATTENDED');
// Group by ISO week, count consecutive weeks from most recent
```

Sprint 4 (challenges) can use `getStreakInfo()` directly. No new streak service needed.

Note: `badge-definitions.ts` has a comment "Streak badges hidden from UI — harmful for youth athletes." **Product decision needed**: are we showing streaks? The plan assumes yes. If hiding, remove streak challenges from Sprint 4 and streak visual from Sprint 3.

---

## 14. CoachProfile: What Exists vs What's Needed

### Existing (constants/app-types.ts)
```typescript
interface CoachProfile {
  userId: string;
  bio: string;
  qualifications: string[];    // ["FA Level 2", "First Aid"]
  specialties: string[];
  yearsExperience: number;
  sessionRate: number;
  availability: AvailabilitySlot[];
  rating: number;
  totalReviews: number;
  totalSessions: number;
}
```

### What Sprint 5 Needs
- `qualificationLevel` → USE `qualifications[0]` (first qualification is highest)
- `qualificationVerified` → NOT needed for MVP (assume all verified in demo)
- `coachingSince` → COMPUTE from `yearsExperience`: `new Date().getFullYear() - yearsExperience`
- `dbsChecked` → ADD field to CoachProfile: `dbsChecked?: boolean`
- `specialisms` → ALREADY exists as `specialties`

### Changes Required
1. Add `dbsChecked?: boolean` to `CoachProfile` in `constants/app-types.ts`
2. Seed `dbsChecked: true` on demo coach profiles in `constants/relational-demo-seeds.ts`
3. Coach badge component reads `qualifications[0]` for display

---

## 15. CHALLENGE BADGE DEFINITIONS

Audit found overlap with existing badges. Resolution:

| Plan Badge | Existing Badge | Action |
|-----------|---------------|--------|
| "Regular" (attendance 3) | — | CREATE |
| "Dedicated" (attendance 6) | "Dedicated Athlete" | SKIP — use existing |
| "Committed" (attendance 10) | "Consistent Attender" | SKIP — use existing |
| "On a Roll" (streak 4) | — | CREATE |
| "Unstoppable" (streak 8) | — | CREATE |
| "Machine" (streak 12) | — | CREATE |
| "Levelling Up" (skill +1) | — | CREATE |
| "Collector" (first badge) | — | CREATE |
| "Reflector" (journal first) | — | CREATE |
| "Growth" (improvement) | "Growth Mindset" exists | SKIP — use existing |

**Net new challenge badges:** 6 (not 15). Add to badge catalog in `badge-service.ts`.

---

## 16. FILE INVENTORY (Corrected)

### Sprint 0: Coach Input (13 files)
| Action | File |
|--------|------|
| NEW | `types/progress-types.ts` |
| NEW | `constants/four-corner-mapping.ts` |
| NEW | `components/session/quick-rate-step.tsx` |
| NEW | `components/session/quick-rate-card.tsx` |
| NEW | `components/session/dot-rating.tsx` |
| NEW | `hooks/use-quick-rate.ts` |
| NEW | `hooks/use-session-media.ts` |
| NEW | `components/session/media-capture-button.tsx` |
| NEW | `components/session/media-thumbnail-strip.tsx` |
| NEW | `components/session/video-recorder-overlay.tsx` |
| NEW | `services/media-service.ts` |
| MODIFY | `hooks/use-session-completion.ts` — add quickRate step + state |
| MODIFY | `services/progress/progress-skills-service.ts` — add bulkUpdateFromQuickRate |
| MODIFY | `services/progress/progress-feedback-service.ts` — add fourCorners field + createFeedbackFromQuickRate |
| MODIFY | `constants/storage-keys.ts` — add SESSION_MEDIA |
| MODIFY | `services/event-bus.ts` — add 6 events |

### Sprint 1: The Scroll (14 files)
| Action | File |
|--------|------|
| NEW | `components/progress/moment-hero.tsx` |
| NEW | `hooks/use-progress-moment.ts` |
| NEW | `components/progress/four-corner-diamond.tsx` |
| NEW | `components/progress/corner-detail-panel.tsx` |
| NEW | `hooks/use-four-corners.ts` |
| NEW | `components/progress/coach-says-card.tsx` |
| NEW | `components/progress/goals-compact.tsx` |
| NEW | `components/progress/badge-wall.tsx` |
| NEW | `components/progress/badge-circle.tsx` |
| NEW | `components/progress/badge-detail-modal.tsx` |
| NEW | `components/progress/journal-prompt.tsx` |
| NEW | `components/progress/parent-value-summary.tsx` |
| NEW | `hooks/use-month-summary.ts` |
| MODIFY | `app/development/my-progress.tsx` — rebuild scroll, wire celebrations |
| MODIFY | `hooks/use-my-progress.ts` — add data sources, remove tab state |
| MODIFY | `components/progress/skill-level-grid.tsx` — FA Four Corner labels |
| MODIFY | `components/progress/progress-badges-tab.tsx` — grid layout using badge-wall |

### Sprint 2: Media (11 files)
| Action | File |
|--------|------|
| NEW | `components/progress/past-sessions-timeline.tsx` |
| NEW | `components/progress/session-timeline-card.tsx` |
| NEW | `components/progress/corner-dots-compact.tsx` |
| NEW | `hooks/use-past-sessions.ts` |
| NEW | `components/progress/media-strip.tsx` |
| NEW | `components/progress/photo-viewer.tsx` |
| NEW | `components/progress/video-player-overlay.tsx` |
| NEW | `app/development/media-gallery.tsx` |
| NEW | `app/development/session-history.tsx` |
| MODIFY | `services/media-service.ts` — add thumbnail gen, sharing, cleanup |
| MODIFY | `components/progress/coach-says-card.tsx` — add media strip |

### Sprint 3: Identity (10 files)
| Action | File |
|--------|------|
| NEW | `components/progress/player-card.tsx` |
| NEW | `components/progress/player-card-front.tsx` |
| NEW | `components/progress/player-card-back.tsx` |
| NEW | `hooks/use-player-card.ts` |
| NEW | `utils/fifa-score.ts` |
| NEW | `utils/card-share.ts` |
| NEW | `components/progress/streak-visual.tsx` |
| NEW | `hooks/use-level-detection.ts` |
| MODIFY | `components/progress/badge-detail-modal.tsx` — rarity, share |
| MODIFY | `hooks/use-my-progress.ts` — load streak data |

### Sprint 4: Challenges (7 files)
| Action | File |
|--------|------|
| NEW | `services/progress/progress-challenge-service.ts` |
| NEW | `constants/challenge-definitions.ts` |
| NEW | `components/progress/next-challenge.tsx` |
| NEW | `hooks/use-active-challenge.ts` |
| MODIFY | `constants/storage-keys.ts` — add challenge keys |
| MODIFY | `services/badge-service.ts` — add 6 challenge badge definitions |
| MODIFY | `components/progress/progress-goals-tab.tsx` — add challenge card at top |

### Sprint 5: Parent (8 files)
| Action | File |
|--------|------|
| NEW | `components/progress/coach-badge.tsx` |
| NEW | `services/progress/monthly-summary-service.ts` |
| NEW | `components/progress/family-highlights.tsx` |
| NEW | `components/progress/homework-card.tsx` |
| MODIFY | `constants/app-types.ts` — add dbsChecked to CoachProfile |
| MODIFY | `constants/relational-demo-seeds.ts` — seed coach qual data |
| MODIFY | `hooks/use-progress-moment.ts` — parent priority + media_captured |
| MODIFY | `components/progress/session-timeline-card.tsx` — coach badge |

### Sprint 6: Polish (10 files)
| Action | File |
|--------|------|
| NEW | `components/progress/level-up-ceremony.tsx` |
| NEW | `hooks/use-scroll-animations.ts` |
| NEW | `utils/haptics.ts` |
| MODIFY | `components/progress/four-corner-diamond.tsx` — load animation |
| MODIFY | `components/progress/player-card.tsx` — flip + shimmer |
| MODIFY | `components/progress/badge-circle.tsx` — unlock animation |
| MODIFY | `components/celebration-overlay.tsx` — tiered configs |
| MODIFY | `components/session/dot-rating.tsx` — tap animation |
| MODIFY | `components/progress/streak-visual.tsx` — flame wiggle |
| MODIFY | `components/progress/next-challenge.tsx` — progress bar animation |

### CORRECTED TOTALS

| Sprint | New | Modified | Total Files |
|--------|-----|----------|-------------|
| S0 | 11 | 5 | 16 |
| S1 | 13 | 4 | 17 |
| S2 | 9 | 2 | 11 |
| S3 | 8 | 2 | 10 |
| S4 | 4 | 3 | 7 |
| S5 | 4 | 4 | 8 |
| S6 | 3 | 7 | 10 |
| **TOTAL** | **52 new** | **27 modified** | **79 file touches** |
