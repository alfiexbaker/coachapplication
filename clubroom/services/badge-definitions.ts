/**
 * Badge Definitions
 *
 * Constants for session milestones and event-based recognitions.
 * Aligned to FA Four Corners: Technical, Physical, Psychological, Social.
 *
 * Streak badges removed from UI (consensus: harmful for youth athletes
 * whose attendance is parent-dependent). Data kept internally for future
 * "rhythm" feature if retention data demands it.
 */

export interface MilestoneBadgeDefinition {
  id: string;
  label: string;
  description: string;
  threshold: number;
  tier: 1 | 2 | 3;
  pointValue: number;
}

export interface StreakBadgeDefinition {
  id: string;
  label: string;
  description: string;
  threshold: number;
  tier: 1 | 2 | 3;
  pointValue: number;
}

export interface EventBadgeDefinition {
  id: string;
  label: string;
  description: string;
  category: 'technical' | 'physical' | 'psychological' | 'social';
  tier: 1 | 2 | 3;
  pointValue: number;
  requirementLabel: string;
  mockUnlocked: boolean;
  mockEarnedAt?: string;
}

export interface AllBadgeWithProgress {
  id: string;
  label: string;
  description: string;
  category:
    | 'technical'
    | 'physical'
    | 'psychological'
    | 'social'
    | 'milestone'
    | 'streak'
    | 'event';
  tier: 1 | 2 | 3;
  pointValue: number;
  earned: boolean;
  earnedAt?: string;
  progress?: number;
  targetValue?: number;
}

// Session milestone definitions — clean, factual names
export const SESSION_MILESTONE_BADGES: MilestoneBadgeDefinition[] = [
  {
    id: 'milestone_1_session',
    label: 'First Session',
    description: 'Completed your first training session',
    threshold: 1,
    tier: 1,
    pointValue: 5,
  },
  {
    id: 'milestone_3_sessions',
    label: '3 Sessions',
    description: 'Committed to the process — 3 sessions complete',
    threshold: 3,
    tier: 1,
    pointValue: 5,
  },
  {
    id: 'milestone_5_sessions',
    label: '5 Sessions',
    description: 'Building a training habit — 5 sessions complete',
    threshold: 5,
    tier: 1,
    pointValue: 10,
  },
  {
    id: 'milestone_10_sessions',
    label: '10 Sessions',
    description: 'Dedicated to development — 10 sessions complete',
    threshold: 10,
    tier: 1,
    pointValue: 15,
  },
  {
    id: 'milestone_25_sessions',
    label: '25 Sessions',
    description: 'Established athlete — 25 sessions complete',
    threshold: 25,
    tier: 2,
    pointValue: 25,
  },
  {
    id: 'milestone_50_sessions',
    label: '50 Sessions',
    description: 'Committed to your craft — 50 sessions complete',
    threshold: 50,
    tier: 2,
    pointValue: 35,
  },
  {
    id: 'milestone_100_sessions',
    label: '100 Sessions',
    description: 'Elite commitment — 100 sessions complete',
    threshold: 100,
    tier: 3,
    pointValue: 50,
  },
];

// Streak definitions — kept internally for data tracking, NOT shown in UI
export const STREAK_BADGES: StreakBadgeDefinition[] = [
  {
    id: 'streak_2_weeks',
    label: '2-Week Consistency',
    description: 'Trained consistently for 2 weeks',
    threshold: 2,
    tier: 1,
    pointValue: 10,
  },
  {
    id: 'streak_4_weeks',
    label: '4-Week Consistency',
    description: 'Trained consistently for 4 weeks',
    threshold: 4,
    tier: 2,
    pointValue: 20,
  },
  {
    id: 'streak_8_weeks',
    label: '8-Week Consistency',
    description: 'Trained consistently for 8 weeks',
    threshold: 8,
    tier: 2,
    pointValue: 30,
  },
  {
    id: 'streak_12_weeks',
    label: '12-Week Consistency',
    description: 'Trained consistently for 12 weeks',
    threshold: 12,
    tier: 3,
    pointValue: 50,
  },
];

// Event-based recognition definitions — mapped to FA Four Corners
export const EVENT_BADGES: EventBadgeDefinition[] = [
  {
    id: 'event_tournament_participation',
    label: 'Tournament Debut',
    description: 'Participated in first tournament',
    category: 'psychological',
    tier: 1,
    pointValue: 20,
    requirementLabel: 'Enter a tournament',
    mockUnlocked: true,
    mockEarnedAt: '2025-07-10T09:00:00Z',
  },
  {
    id: 'event_summer_camp',
    label: 'Summer Programme',
    description: 'Completed summer training programme',
    category: 'physical',
    tier: 2,
    pointValue: 30,
    requirementLabel: 'Complete summer programme',
    mockUnlocked: true,
    mockEarnedAt: '2025-08-15T10:00:00Z',
  },
  {
    id: 'event_tournament_mvp',
    label: 'Tournament MVP',
    description: 'Named Most Valuable Player in a tournament',
    category: 'technical',
    tier: 3,
    pointValue: 50,
    requirementLabel: 'Win Tournament MVP',
    mockUnlocked: false,
  },
  {
    id: 'event_first_goal',
    label: 'First Goal',
    description: 'Scored your first competitive goal',
    category: 'technical',
    tier: 1,
    pointValue: 15,
    requirementLabel: 'Score in a match',
    mockUnlocked: true,
    mockEarnedAt: '2025-06-22T14:30:00Z',
  },
  {
    id: 'event_clean_sheet',
    label: 'Clean Sheet',
    description: 'Kept a clean sheet as goalkeeper',
    category: 'technical',
    tier: 2,
    pointValue: 25,
    requirementLabel: 'Keep a clean sheet',
    mockUnlocked: false,
  },
  {
    id: 'event_community_helper',
    label: 'Peer Coaching',
    description: 'Helped coach younger players in a session',
    category: 'social',
    tier: 2,
    pointValue: 25,
    requirementLabel: 'Assist in coaching session',
    mockUnlocked: false,
  },
];
