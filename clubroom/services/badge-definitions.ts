/**
 * Badge Definitions — Re-exports from constants/badge-registry.ts
 *
 * This file exists for backward-compatibility. All definitions now live
 * in constants/badge-registry.ts (single source of truth).
 */

export type {
  MilestoneBadgeDefinition,
  StreakBadgeDefinition,
  EventBadgeDefinition,
} from '@/constants/badge-registry';

export {
  SESSION_MILESTONE_BADGES,
  STREAK_BADGES,
  EVENT_BADGES,
  EVENT_BADGE_IDS,
} from '@/constants/badge-registry';

// AllBadgeWithProgress stays here — it's a service-layer view model, not a registry concern
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
