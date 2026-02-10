import { useCallback, useState } from 'react';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';

import { badgeService } from '@/services/badge-service';
import { userService } from '@/services/user-service';
import type { BadgeAward, BadgeCategory, User } from '@/constants/types';
import type { Ionicons } from '@expo/vector-icons';
import { createLogger } from '@/utils/logger';

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

export function useChildBadges() {
  const { childId, highlightBadge } = useLocalSearchParams<{ childId: string; highlightBadge?: string }>();

  const [child, setChild] = useState<User | null>(null);
  const [awards, setAwards] = useState<BadgeAward[]>([]);
  const [progressionData, setProgressionData] = useState<ProgressionData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!childId) return;
    setLoading(true);

    try {
      const childResult = await userService.getUserById(childId);
      if (childResult.success) {
        setChild(childResult.data);
      } else {
        setChild(null);
        logger.error('Failed to load child profile for badges', {
          childId,
          error: childResult.error,
        });
      }

      const [awardsData, progression] = await Promise.all([
        badgeService.listAwardsForAthlete(childId),
        badgeService.getProgressionSummary(childId),
      ]);

      const visibleAwards = awardsData.filter(a => a.visibility !== 'coach_only');
      setAwards(visibleAwards);
      setProgressionData(progression);

      await badgeService.markAllSeenByParent(childId);
    } catch (error) {
      logger.error('Failed to load child badges data', { childId, error });
      setChild(null);
    } finally {
      setLoading(false);
    }
  }, [childId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  return {
    child, awards, progressionData, loading, highlightBadge, loadData,
  };
}

export function getTierColor(tier?: 1 | 2 | 3): string {
  switch (tier) {
    case 3: return BADGE_TIER_COLORS.gold;
    case 2: return BADGE_TIER_COLORS.silver;
    case 1: return BADGE_TIER_COLORS.bronze;
    default: return BADGE_TIER_COLORS.default;
  }
}

export function getCategoryIcon(category?: BadgeCategory): keyof typeof Ionicons.glyphMap {
  if (!category) return 'ribbon';
  const icons: Record<BadgeCategory, keyof typeof Ionicons.glyphMap> = {
    leadership: 'people',
    consistency: 'refresh',
    technique: 'football',
    mindset: 'bulb',
    teamwork: 'hand-left',
    resilience: 'fitness',
  };
  return icons[category];
}

export function isRecent(awardedAt: string): boolean {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return new Date(awardedAt).getTime() > weekAgo;
}
