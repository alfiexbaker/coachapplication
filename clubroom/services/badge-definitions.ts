/**
 * Badge Definitions
 *
 * Constants for badge milestones, streaks, and event badges.
 * Extracted from badge-service.ts to reduce file size.
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
  category: 'leadership' | 'consistency' | 'technique' | 'mindset' | 'teamwork' | 'resilience';
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
    | 'leadership'
    | 'consistency'
    | 'technique'
    | 'mindset'
    | 'teamwork'
    | 'resilience'
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

// Session milestone badge definitions
export const SESSION_MILESTONE_BADGES: MilestoneBadgeDefinition[] = [
  {
    id: 'milestone_5_sessions',
    label: 'First Five',
    description: 'Complete 5 training sessions',
    threshold: 5,
    tier: 1,
    pointValue: 10,
  },
  {
    id: 'milestone_10_sessions',
    label: 'Double Digits',
    description: 'Complete 10 training sessions',
    threshold: 10,
    tier: 1,
    pointValue: 15,
  },
  {
    id: 'milestone_25_sessions',
    label: 'Quarter Century',
    description: 'Complete 25 training sessions',
    threshold: 25,
    tier: 2,
    pointValue: 25,
  },
  {
    id: 'milestone_50_sessions',
    label: 'Half Century',
    description: 'Complete 50 training sessions',
    threshold: 50,
    tier: 2,
    pointValue: 35,
  },
  {
    id: 'milestone_100_sessions',
    label: 'Century Club',
    description: 'Complete 100 training sessions',
    threshold: 100,
    tier: 3,
    pointValue: 50,
  },
];

// Weekly streak badge definitions
export const STREAK_BADGES: StreakBadgeDefinition[] = [
  {
    id: 'streak_2_weeks',
    label: '2 Week Streak',
    description: 'Train consistently for 2 weeks in a row',
    threshold: 2,
    tier: 1,
    pointValue: 10,
  },
  {
    id: 'streak_4_weeks',
    label: '4 Week Streak',
    description: 'Train consistently for 4 weeks in a row',
    threshold: 4,
    tier: 2,
    pointValue: 20,
  },
  {
    id: 'streak_8_weeks',
    label: '8 Week Dedication',
    description: 'Train consistently for 8 weeks in a row',
    threshold: 8,
    tier: 2,
    pointValue: 30,
  },
  {
    id: 'streak_12_weeks',
    label: '12 Week Champion',
    description: 'Train consistently for 12 weeks in a row',
    threshold: 12,
    tier: 3,
    pointValue: 50,
  },
];

// Event-based badge definitions
export const EVENT_BADGES: EventBadgeDefinition[] = [
  {
    id: 'event_tournament_participation',
    label: 'Tournament Player',
    description: 'Participated in first tournament',
    category: 'consistency',
    tier: 1,
    pointValue: 20,
    requirementLabel: 'Enter a tournament',
    mockUnlocked: true,
    mockEarnedAt: '2025-07-10T09:00:00Z',
  },
  {
    id: 'event_summer_camp',
    label: 'Summer Camper',
    description: 'Attended summer training camp',
    category: 'consistency',
    tier: 2,
    pointValue: 30,
    requirementLabel: 'Complete Summer Camp',
    mockUnlocked: true,
    mockEarnedAt: '2025-08-15T10:00:00Z',
  },
  {
    id: 'event_tournament_mvp',
    label: 'Tournament MVP',
    description: 'Named Most Valuable Player in a tournament',
    category: 'leadership',
    tier: 3,
    pointValue: 50,
    requirementLabel: 'Win Tournament MVP',
    mockUnlocked: false,
  },
  {
    id: 'event_first_goal',
    label: 'First Goal',
    description: 'Scored your first competitive goal',
    category: 'technique',
    tier: 1,
    pointValue: 15,
    requirementLabel: 'Score in a match',
    mockUnlocked: true,
    mockEarnedAt: '2025-06-22T14:30:00Z',
  },
  {
    id: 'event_clean_sheet',
    label: 'Clean Sheet Hero',
    description: 'Kept a clean sheet as goalkeeper',
    category: 'technique',
    tier: 2,
    pointValue: 25,
    requirementLabel: 'Keep a clean sheet',
    mockUnlocked: false,
  },
  {
    id: 'event_community_helper',
    label: 'Community Helper',
    description: 'Helped coach younger players in a session',
    category: 'teamwork',
    tier: 2,
    pointValue: 25,
    requirementLabel: 'Assist in coaching session',
    mockUnlocked: false,
  },
];
