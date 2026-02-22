import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';

import { useChildContext } from '@/hooks/use-child-context';
import { useScreen } from '@/hooks/use-screen';
import { badgeService } from '@/services/badge-service';
import { userService } from '@/services/user-service';
import type { BadgeAward, BadgeCategory, User } from '@/constants/types';
import type { Ionicons } from '@expo/vector-icons';
import { createLogger } from '@/utils/logger';
import { err, ok, serviceError, type ServiceError } from '@/types/result';
import type { SwitcherChild } from '@/components/family/child-switcher';

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
  const { children, activeChildId, setActiveChildId } = useChildContext();
  const [selectedChildId, setSelectedChildId] = useState<string | null>(childId ?? null);

  const switcherChildren = useMemo<SwitcherChild[]>(
    () =>
      children.map((child) => ({
        id: child.id,
        name: child.name,
        initials: child.initials,
        colorCode: child.colorCode,
      })),
    [children],
  );

  const resolvedChildId = useMemo(() => {
    const availableIds = new Set(switcherChildren.map((child) => child.id));
    if (childId && availableIds.has(childId)) return childId;
    if (activeChildId && availableIds.has(activeChildId)) return activeChildId;
    if (switcherChildren.length > 0) return switcherChildren[0].id;
    return childId ?? null;
  }, [childId, activeChildId, switcherChildren]);

  useEffect(() => {
    if (!resolvedChildId || resolvedChildId === selectedChildId) {
      return;
    }
    setSelectedChildId(resolvedChildId);
  }, [resolvedChildId, selectedChildId]);

  useEffect(() => {
    if (!selectedChildId || selectedChildId === activeChildId) {
      return;
    }
    void setActiveChildId(selectedChildId);
  }, [selectedChildId, activeChildId, setActiveChildId]);

  const handleSelectChild = useCallback(
    (nextChildId: string) => {
      setSelectedChildId(nextChildId);
      void setActiveChildId(nextChildId);
    },
    [setActiveChildId],
  );

  const loadData = useCallback(async () => {
    if (!selectedChildId) {
      return ok<ChildBadgesData>({
        child: null,
        awards: [],
        progressionData: null,
      });
    }

    try {
      const childResult = await userService.getUserById(selectedChildId);
      let child: User | null = null;
      if (childResult.success) {
        child = childResult.data;
      } else {
        logger.error('Failed to load child profile for badges', {
          childId: selectedChildId,
          error: childResult.error,
        });
      }

      const [awardsData, progression] = await Promise.all([
        badgeService.listAwardsForAthlete(selectedChildId),
        badgeService.getProgressionSummary(selectedChildId),
      ]);

      const visibleAwards = awardsData.filter((a) => a.visibility !== 'coach_only');
      await badgeService.markAllSeenByParent(selectedChildId);
      return ok<ChildBadgesData>({
        child,
        awards: visibleAwards,
        progressionData: progression,
      });
    } catch (error) {
      logger.error('Failed to load child badges data', { childId: selectedChildId, error });
      return err(serviceError('UNKNOWN', 'Failed to load child badges.', error));
    }
  }, [selectedChildId]);

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<ChildBadgesData>({
    load: loadData,
    deps: [selectedChildId],
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
    switcherChildren,
    selectedChildId,
    activeChildId,
    handleSelectChild,
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
