/**
 * Badge Registry — Single source of truth for ALL badge definitions.
 *
 * Every badge ID, label, description, category, and tier lives here.
 * Services, components, and tests MUST import badge data from this file.
 *
 * Three badge families:
 *   1. SKILL_BADGES — Coach-awarded recognitions (FA Four Corners aligned)
 *   2. SESSION_MILESTONE_BADGES — Attendance-based (auto-awarded)
 *   3. EVENT_BADGES — Event-based recognitions
 *   (Streak badges kept internally, not shown in UI)
 */

import type { BadgeDefinition, BadgeCategory } from './user-types';

// ─── Types ────────────────────────────────────────────────────────────────────

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
  category: BadgeCategory;
  tier: 1 | 2 | 3;
  pointValue: number;
  requirementLabel: string;
  mockUnlocked: boolean;
  mockEarnedAt?: string;
}

// ─── Skill Badges (coach-awarded, FA Four Corners) ───────────────────────────

export const SKILL_BADGES: BadgeDefinition[] = [
  {
    id: 'badge_best_training',
    label: 'Standout Session',
    tone: 'success',
    description: 'Recognised for outstanding effort and focus in training.',
    category: 'physical',
    tier: 1,
    pointValue: 10,
  },
  {
    id: 'badge_streak_starter',
    label: 'Consistent Attender',
    tone: 'default',
    description: 'Demonstrated reliable attendance across sessions.',
    category: 'psychological',
    tier: 1,
    pointValue: 10,
  },
  {
    id: 'badge_dedicated_athlete',
    label: 'Dedicated Athlete',
    tone: 'success',
    description: 'Maintained strong attendance and commitment.',
    category: 'psychological',
    tier: 2,
    pointValue: 25,
  },
  {
    id: 'badge_master_passer',
    label: 'Vision & Passing',
    tone: 'default',
    description: 'Recognised for reliable build-up play and vision.',
    category: 'technical',
    tier: 2,
    pointValue: 25,
  },
  {
    id: 'badge_sharp_shooter_pro',
    label: 'Clinical Finishing',
    tone: 'warning',
    description: 'Recognised for composure and accuracy under pressure.',
    category: 'technical',
    tier: 3,
    pointValue: 50,
  },
  {
    id: 'badge_first_touch',
    label: 'Ball Control',
    tone: 'default',
    description: 'Demonstrated excellent ball control in tight spaces.',
    category: 'technical',
    tier: 1,
    pointValue: 10,
  },
  {
    id: 'badge_team_captain',
    label: 'Session Leader',
    tone: 'success',
    description: 'Led drills and encouraged teammates.',
    category: 'social',
    tier: 2,
    pointValue: 25,
  },
  {
    id: 'badge_vocal_leader',
    label: 'Communication',
    tone: 'default',
    description: 'Communicated well and organised the group.',
    category: 'social',
    tier: 1,
    pointValue: 10,
  },
  {
    id: 'badge_mentor',
    label: 'Mentoring',
    tone: 'success',
    description: 'Helped younger players improve their skills.',
    category: 'social',
    tier: 3,
    pointValue: 50,
  },
  {
    id: 'badge_growth_mindset',
    label: 'Growth Mindset',
    tone: 'default',
    description: 'Embraced challenges and learned from mistakes.',
    category: 'psychological',
    tier: 1,
    pointValue: 10,
  },
  {
    id: 'badge_focused_athlete',
    label: 'Focus & Concentration',
    tone: 'success',
    description: 'Maintained concentration throughout the session.',
    category: 'psychological',
    tier: 2,
    pointValue: 25,
  },
  {
    id: 'badge_team_player',
    label: 'Team Player',
    tone: 'default',
    description: 'Put the team first and supported others.',
    category: 'social',
    tier: 1,
    pointValue: 10,
  },
  // Generic recognition badges — one per FA Four Corners category
  {
    id: 'badge_recognition_technical',
    label: 'Technical Recognition',
    tone: 'default',
    description: 'Recognised for technical development.',
    category: 'technical',
    tier: 1,
    pointValue: 10,
  },
  {
    id: 'badge_recognition_physical',
    label: 'Physical Recognition',
    tone: 'default',
    description: 'Recognised for physical development.',
    category: 'physical',
    tier: 1,
    pointValue: 10,
  },
  {
    id: 'badge_recognition_psychological',
    label: 'Psychological Recognition',
    tone: 'default',
    description: 'Recognised for psychological development.',
    category: 'psychological',
    tier: 1,
    pointValue: 10,
  },
  {
    id: 'badge_recognition_social',
    label: 'Social Recognition',
    tone: 'default',
    description: 'Recognised for social development.',
    category: 'social',
    tier: 1,
    pointValue: 10,
  },
  {
    id: 'badge_assist_king',
    label: 'Creating Opportunities',
    tone: 'success',
    description: 'Created multiple opportunities for teammates.',
    category: 'technical',
    tier: 2,
    pointValue: 25,
  },
  {
    id: 'badge_comeback_kid',
    label: 'Resilience',
    tone: 'warning',
    description: 'Bounced back from setbacks with determination.',
    category: 'psychological',
    tier: 2,
    pointValue: 25,
  },
  {
    id: 'badge_never_give_up',
    label: 'Perseverance',
    tone: 'success',
    description: 'Showed incredible perseverance under pressure.',
    category: 'psychological',
    tier: 3,
    pointValue: 50,
  },
  // Position-specific badges
  {
    id: 'badge_shot_stopping',
    label: 'Shot Stopping',
    tone: 'default',
    description: 'Recognised for excellent shot stopping ability.',
    category: 'technical',
    tier: 1,
    pointValue: 10,
  },
  {
    id: 'badge_tackling',
    label: 'Tackling',
    tone: 'default',
    description: 'Recognised for clean, well-timed tackles.',
    category: 'technical',
    tier: 1,
    pointValue: 10,
  },
  {
    id: 'badge_heading_aerial',
    label: 'Heading & Aerial',
    tone: 'default',
    description: 'Recognised for dominance in the air.',
    category: 'technical',
    tier: 1,
    pointValue: 10,
  },
  {
    id: 'badge_game_vision',
    label: 'Game Vision',
    tone: 'success',
    description: 'Recognised for reading the game and making smart decisions.',
    category: 'technical',
    tier: 2,
    pointValue: 25,
  },
  {
    id: 'badge_dribbling',
    label: 'Dribbling & Skills',
    tone: 'default',
    description: 'Recognised for close control and flair on the ball.',
    category: 'technical',
    tier: 1,
    pointValue: 10,
  },
  {
    id: 'badge_movement',
    label: 'Movement',
    tone: 'default',
    description: 'Recognised for intelligent runs and positioning off the ball.',
    category: 'technical',
    tier: 1,
    pointValue: 10,
  },
  {
    id: 'badge_tempo_control',
    label: 'Tempo & Control',
    tone: 'success',
    description: 'Recognised for dictating the pace and flow of play.',
    category: 'technical',
    tier: 2,
    pointValue: 25,
  },
  {
    id: 'badge_work_rate',
    label: 'Work Rate',
    tone: 'default',
    description: 'Recognised for relentless effort and energy.',
    category: 'physical',
    tier: 1,
    pointValue: 10,
  },
  // Challenge reward badges
  {
    id: 'badge_challenge_on_a_roll',
    label: 'On a Roll',
    tone: 'success',
    description: 'Completed a consistency streak challenge.',
    category: 'psychological',
    tier: 1,
    pointValue: 10,
  },
  {
    id: 'badge_challenge_unstoppable',
    label: 'Unstoppable',
    tone: 'success',
    description: 'Completed a major streak milestone challenge.',
    category: 'psychological',
    tier: 2,
    pointValue: 25,
  },
  {
    id: 'badge_challenge_machine',
    label: 'Machine',
    tone: 'warning',
    description: 'Completed an elite streak challenge.',
    category: 'psychological',
    tier: 3,
    pointValue: 50,
  },
  {
    id: 'badge_challenge_levelling_up',
    label: 'Levelling Up',
    tone: 'default',
    description: 'Completed a skill development challenge.',
    category: 'technical',
    tier: 1,
    pointValue: 10,
  },
  {
    id: 'badge_challenge_collector',
    label: 'Collector',
    tone: 'default',
    description: 'Completed a badge collection challenge.',
    category: 'social',
    tier: 1,
    pointValue: 10,
  },
  {
    id: 'badge_challenge_reflector',
    label: 'Reflector',
    tone: 'default',
    description: 'Completed a reflection challenge.',
    category: 'psychological',
    tier: 1,
    pointValue: 10,
  },
];

// ─── Session Milestone Badges (auto-awarded on attendance thresholds) ─────────

export const SESSION_MILESTONE_BADGES: MilestoneBadgeDefinition[] = [
  { id: 'milestone_1_session', label: 'First Session', description: 'Completed your first training session', threshold: 1, tier: 1, pointValue: 5 },
  { id: 'milestone_3_sessions', label: '3 Sessions', description: 'Committed to the process — 3 sessions complete', threshold: 3, tier: 1, pointValue: 5 },
  { id: 'milestone_5_sessions', label: '5 Sessions', description: 'Building a training habit — 5 sessions complete', threshold: 5, tier: 1, pointValue: 10 },
  { id: 'milestone_10_sessions', label: '10 Sessions', description: 'Dedicated to development — 10 sessions complete', threshold: 10, tier: 1, pointValue: 15 },
  { id: 'milestone_25_sessions', label: '25 Sessions', description: 'Established athlete — 25 sessions complete', threshold: 25, tier: 2, pointValue: 25 },
  { id: 'milestone_50_sessions', label: '50 Sessions', description: 'Committed to your craft — 50 sessions complete', threshold: 50, tier: 2, pointValue: 35 },
  { id: 'milestone_100_sessions', label: '100 Sessions', description: 'Elite commitment — 100 sessions complete', threshold: 100, tier: 3, pointValue: 50 },
];

// ─── Streak Badges (internal only, NOT shown in UI) ───────────────────────────

export const STREAK_BADGES: StreakBadgeDefinition[] = [
  { id: 'streak_2_weeks', label: '2-Week Consistency', description: 'Trained consistently for 2 weeks', threshold: 2, tier: 1, pointValue: 10 },
  { id: 'streak_4_weeks', label: '4-Week Consistency', description: 'Trained consistently for 4 weeks', threshold: 4, tier: 2, pointValue: 20 },
  { id: 'streak_8_weeks', label: '8-Week Consistency', description: 'Trained consistently for 8 weeks', threshold: 8, tier: 2, pointValue: 30 },
  { id: 'streak_12_weeks', label: '12-Week Consistency', description: 'Trained consistently for 12 weeks', threshold: 12, tier: 3, pointValue: 50 },
];

// ─── Event Badges ─────────────────────────────────────────────────────────────

export const EVENT_BADGES: EventBadgeDefinition[] = [
  { id: 'event_tournament_participation', label: 'Tournament Debut', description: 'Participated in first tournament', category: 'psychological', tier: 1, pointValue: 20, requirementLabel: 'Enter a tournament', mockUnlocked: true, mockEarnedAt: '2025-07-10T09:00:00Z' },
  { id: 'event_summer_camp', label: 'Summer Programme', description: 'Completed summer training programme', category: 'physical', tier: 2, pointValue: 30, requirementLabel: 'Complete summer programme', mockUnlocked: true, mockEarnedAt: '2025-08-15T10:00:00Z' },
  { id: 'event_tournament_mvp', label: 'Tournament MVP', description: 'Named Most Valuable Player in a tournament', category: 'technical', tier: 3, pointValue: 50, requirementLabel: 'Win Tournament MVP', mockUnlocked: false },
  { id: 'event_first_goal', label: 'First Goal', description: 'Scored your first competitive goal', category: 'technical', tier: 1, pointValue: 15, requirementLabel: 'Score in a match', mockUnlocked: true, mockEarnedAt: '2025-06-22T14:30:00Z' },
  { id: 'event_clean_sheet', label: 'Clean Sheet', description: 'Kept a clean sheet as goalkeeper', category: 'technical', tier: 2, pointValue: 25, requirementLabel: 'Keep a clean sheet', mockUnlocked: false },
  { id: 'event_community_helper', label: 'Peer Coaching', description: 'Helped coach younger players in a session', category: 'social', tier: 2, pointValue: 25, requirementLabel: 'Assist in coaching session', mockUnlocked: false },
];

export const EVENT_BADGE_IDS = new Set(EVENT_BADGES.map((e) => e.id));

// ─── Derived lookups ──────────────────────────────────────────────────────────

/** All skill badge IDs (excludes generic recognition badges) */
export const MEANINGFUL_SKILL_BADGE_IDS = new Set(
  SKILL_BADGES
    .filter((b) => !b.id.startsWith('badge_recognition_'))
    .map((b) => b.id),
);

/** Quick lookup: badge ID → BadgeDefinition */
export const SKILL_BADGE_BY_ID = new Map(
  SKILL_BADGES.map((b) => [b.id, b]),
);

/** Quick lookup: badge ID → label */
export function getBadgeLabel(badgeId: string): string {
  return SKILL_BADGE_BY_ID.get(badgeId)?.label ?? badgeId;
}
