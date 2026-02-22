import type { BadgeCategory } from '@/constants/user-types';

// ─── Quick Rate ───

export type PositionRole = 'GK' | 'DEF' | 'MID' | 'ATT';

export type UniversalSkill = 'Work Rate' | 'Attitude' | 'Communication' | 'Coachability';

export type GoalkeeperSkill =
  | 'Shot Stopping'
  | 'Handling & Crosses'
  | 'Distribution'
  | 'Positioning & Sweeping'
  | 'Command of Area';

export type DefenderSkill =
  | 'Tackling'
  | 'Heading & Aerial'
  | 'Positioning'
  | 'Playing Out'
  | '1v1 Defending';

export type MidfielderSkill =
  | 'Passing'
  | 'Ball Carrying'
  | 'Game Vision'
  | 'Pressing & Defending'
  | 'Tempo & Control';

export type AttackerSkill =
  | 'Finishing'
  | 'Movement'
  | 'Dribbling & Skills'
  | 'Hold-Up Play'
  | 'Pressing & Work Rate';

export type PositionalSkill =
  | GoalkeeperSkill
  | DefenderSkill
  | MidfielderSkill
  | AttackerSkill;

export type FootballSkill = UniversalSkill | PositionalSkill;

export type SkillRatingLevel =
  | 'Developing'
  | 'Good'
  | 'Very Good'
  | 'Excellent'
  | 'Exceptional';

export type SkillTrendDirection = 'improving' | 'consistent' | 'declining';

export type ParentSkillGroup =
  | 'Ball Skills'
  | 'Attacking'
  | 'Defending'
  | 'Game Sense'
  | 'Character';

export interface SessionSkillRating {
  skill: FootballSkill;
  rating: 1 | 2 | 3 | 4 | 5;
  label: SkillRatingLevel;
  trend: SkillTrendDirection;
  previousRating?: number;
}

export interface QuickRateInput {
  athleteId: string;
  athleteName: string;
  sessionId: string;
  coachId: string;
  // Legacy corner ratings (kept for backward compatibility with existing sessions).
  technical?: number; // 1-5 dots
  physical?: number; // 1-5 dots
  psychological?: number; // 1-5 dots
  social?: number; // 1-5 dots (NOT tactical)
  effort: number; // 1-5
  positionPlayed?: PositionRole;
  positionSkillRatings?: SessionSkillRating[];
  mediaIds?: string[];
  badgeId?: string;
  focusSkills?: string[];
  sessionTemplateId?: string;
  sessionTemplateName?: string;
  sessionTitle?: string;
}

export type FourCornerKey = BadgeCategory; // 'technical' | 'physical' | 'psychological' | 'social'

export interface FourCornerRatings {
  technical: number; // 1-5
  physical: number; // 1-5
  psychological: number; // 1-5
  social: number; // 1-5
}

export interface FourCornerDisplay {
  key: FourCornerKey;
  label: string;
  icon: string;
  value: number; // 0-100 (average of skills in corner, mapped from 1-10 → 10-100)
  skillCount: number;
  color: string;
}

export interface PentagonAttribute {
  key: string;
  label: string;
  value: number; // 0-100
  rating: number; // 1-5
  ratingLabel: SkillRatingLevel;
  trend: SkillTrendDirection;
  color: string;
  icon: string;
}

export interface UniversalSkillRating {
  skill: UniversalSkill;
  rating: number; // 1-5
  ratingLabel: SkillRatingLevel;
  trend: SkillTrendDirection;
}

export interface PentagonData {
  position: PositionRole;
  attributes: PentagonAttribute[];
  universalSkills: UniversalSkillRating[];
  deltas: Record<string, number>;
  sessionSnapshots: Array<{
    id: string;
    label: string;
    values: Record<string, number>;
  }>;
  comparisonLabel: string | null;
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
  duration: number; // seconds
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
  | 'weekly_recap'
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
  progress: number; // 0-100 computed
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
  summary: string; // publicSummary, truncated to 120 chars
  performance: number; // 1-5
  photos: PhotoAsset[];
  video: VideoAsset | null;
  badgeAwarded?: { label: string; category?: string };
}

export interface PastSessionDelta {
  performance?: number;
  effort?: number;
  technical?: number;
  physical?: number;
  psychological?: number;
  social?: number;
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
  position?: PositionRole;
  corners: {
    technical: number; // FIFA score 1-99
    physical: number;
    psychological: number;
    social: number;
  };
  attributes?: Array<{
    key: string;
    label: string;
    icon: string;
    value: number;
  }>;
  memberSince: string;
  streakWeeks: number;
  totalSessions: number;
  totalBadges: number;
  bestSkill: { name: string; level: number } | null;
  mostImproved: { name: string; changePercent: number } | null;
  latestPhotoUri: string | null;
}
