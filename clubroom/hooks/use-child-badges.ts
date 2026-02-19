import { useCallback } from 'react';
import { useLocalSearchParams } from 'expo-router';

import { useScreen } from '@/hooks/use-screen';
import { badgeService } from '@/services/badge-service';
import { userService } from '@/services/user-service';
import type { BadgeAward, BadgeCategory, User } from '@/constants/types';
import type { Ionicons } from '@expo/vector-icons';
import { createLogger } from '@/utils/logger';
import { err, ok, serviceError, type ServiceError } from '@/types/result';

const logger = createLogger('useChildBadges');

export const BADGE_TIER_COLORS = {
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
  default: '#F59E0B',
} as const;

type ProgressionData = {
  totalPoints: number;
  currentLevel: { level: number; name: string };
  nextLevel: { name: string } | null;
  progressPercent: number;
  pointsToNext: number;
  totalBadges: number;
  categoryBreakdown: { category: BadgeCategory; label: string; badgeCount: number }[];
};

interface ChildBadgesData {
  child: User | null;
  awards: BadgeAward[];
  progressionData: ProgressionData | null;
}

export function useChildBadges() {
  const { childId, highlightBadge } = useLocalSearchParams<{
    childId: string;
    highlightBadge?: string;
  }>();

  const loadData = useCallback(async () => {
    if (!childId) {
      return ok<ChildBadgesData>({
        child: null,
        awards: [],
        progressionData: null,
      });
    }

    try {
      const childResult = await userService.getUserById(childId);
      let child: User | null = null;
      if (childResult.success) {
        child = childResult.data;
      } else {
        logger.error('Failed to load child profile for badges', {
          childId,
          error: childResult.error,
        });
      }

      const [awardsData, progression] = await Promise.all([
        badgeService.listAwardsForAthlete(childId),
        badgeService.getProgressionSummary(childId),
      ]);

      const visibleAwards = awardsData.filter((a) => a.visibility !== 'coach_only');
      await badgeService.markAllSeenByParent(childId);
      return ok<ChildBadgesData>({
        child,
        awards: visibleAwards,
        progressionData: progression,
      });
    } catch (error) {
      logger.error('Failed to load child badges data', { childId, error });
      return err(serviceError('UNKNOWN', 'Failed to load child badges.', error));
    }
  }, [childId]);

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<ChildBadgesData>({
    load: loadData,
    deps: [childId],
    isEmpty: (value) => !value.child || value.awards.length === 0,
    refetchOnFocus: true,
  });

  return {
    child: data?.child ?? null,
    awards: data?.awards ?? [],
    progressionData: data?.progressionData ?? null,
    status,
    error: status === 'error' ? (error as ServiceError | null) : null,
    loading: status === 'loading',
    refreshing,
    onRefresh,
    retry,
    highlightBadge,
    loadData: onRefresh,
  };
}

export function getTierColor(tier?: 1 | 2 | 3): string {
  switch (tier) {
    case 3:
      return BADGE_TIER_COLORS.gold;
    case 2:
      return BADGE_TIER_COLORS.silver;
    case 1:
      return BADGE_TIER_COLORS.bronze;
    default:
      return BADGE_TIER_COLORS.default;
  }
}

export function getCategoryIcon(category?: BadgeCategory): keyof typeof Ionicons.glyphMap {
  if (!category) return 'ribbon';
  const icons: Record<BadgeCategory, keyof typeof Ionicons.glyphMap> = {
    technical: 'football',
    physical: 'fitness',
    psychological: 'bulb',
    social: 'people',
  };
  return icons[category];
}

export function isRecent(awardedAt: string): boolean {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return new Date(awardedAt).getTime() > weekAgo;
}
