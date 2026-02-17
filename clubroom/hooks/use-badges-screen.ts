/**
 * Hook for the All Badges screen.
 * Manages badge loading, filtering by status, grouping by section, and stats.
 */

import { useMemo, useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { badgeService, AllBadgeWithProgress } from '@/services/badge-service';
import { createLogger } from '@/utils/logger';
import { err, ok, serviceError, type ServiceError } from '@/types/result';

const logger = createLogger('BadgesScreen');

export const BADGE_TIER_COLORS = {
  advanced: '#FFD700',
  developing: '#C0C0C0',
  foundation: '#CD7F32',
} as const;

export type FilterTab = 'all' | 'unlocked' | 'in-progress';

export const FILTER_TABS: {
  key: FilterTab;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: 'all', label: 'All', icon: 'grid-outline' },
  { key: 'unlocked', label: 'Earned', icon: 'checkmark-circle-outline' },
  { key: 'in-progress', label: 'Upcoming', icon: 'time-outline' },
];

export const SECTION_ORDER = [
  'milestones',
  'events',
  'technical',
  'physical',
  'psychological',
  'social',
];

interface BadgesScreenData {
  allBadges: AllBadgeWithProgress[];
  badgesByCategory: Map<string, AllBadgeWithProgress[]>;
}

export function useBadgesScreen() {
  const { currentUser } = useAuth();

  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  const loadBadges = useCallback(async () => {
    if (!currentUser?.id) {
      return ok<BadgesScreenData>({ allBadges: [], badgesByCategory: new Map() });
    }

    try {
      const [allBadges, badgesByCategory] = await Promise.all([
        badgeService.getAllBadgesWithProgress(currentUser.id),
        badgeService.getBadgesByCategory(currentUser.id),
      ]);
      logger.info('badges_loaded', {
        totalBadges: allBadges.length,
        unlockedCount: allBadges.filter((badge) => badge.isUnlocked).length,
      });
      return ok<BadgesScreenData>({ allBadges, badgesByCategory });
    } catch (error) {
      logger.error('badges_load_failed', error);
      return err(serviceError('UNKNOWN', 'Failed to load badge progress.', error));
    }
  }, [currentUser?.id]);

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<BadgesScreenData>({
    load: loadBadges,
    deps: [currentUser?.id],
    isEmpty: () => false,
    refetchOnFocus: true,
  });

  const allBadges = data?.allBadges ?? [];
  const badgesByCategory = data?.badgesByCategory ?? new Map<string, AllBadgeWithProgress[]>();

  const filteredBadges = useMemo(() => {
    switch (activeFilter) {
      case 'unlocked':
        return allBadges.filter((b) => b.isUnlocked);
      case 'in-progress':
        // Show next upcoming milestones (closest to unlocking, max 5)
        return allBadges
          .filter((b) => !b.isUnlocked && b.progress > 0)
          .sort((a, b) => b.progress - a.progress)
          .slice(0, 5);
      default:
        // Default: earned + next 3 upcoming (hide deeply locked)
        const earned = allBadges.filter((b) => b.isUnlocked);
        const upcoming = allBadges
          .filter((b) => !b.isUnlocked)
          .sort((a, b) => b.progress - a.progress)
          .slice(0, 3);
        return [...earned, ...upcoming];
    }
  }, [allBadges, activeFilter]);

  const filteredBySection = useMemo(() => {
    if (activeFilter === 'all') return badgesByCategory;
    const grouped = new Map<string, AllBadgeWithProgress[]>();
    filteredBadges.forEach((badge) => {
      const section =
        badge.badgeType === 'milestone'
          ? 'milestones'
          : badge.badgeType === 'event'
            ? 'events'
            : badge.category || 'other';
      if (!grouped.has(section)) grouped.set(section, []);
      grouped.get(section)!.push(badge);
    });
    return grouped;
  }, [filteredBadges, badgesByCategory, activeFilter]);

  const stats = useMemo(() => {
    const total = allBadges.length;
    const unlocked = allBadges.filter((b) => b.isUnlocked).length;
    const points = allBadges.filter((b) => b.isUnlocked).reduce((sum, b) => sum + b.pointValue, 0);
    return { total, unlocked, points };
  }, [allBadges]);

  const getFilterCount = useCallback(
    (key: FilterTab) => {
      switch (key) {
        case 'all':
          return allBadges.filter((b) => b.isUnlocked).length + Math.min(3, allBadges.filter((b) => !b.isUnlocked).length);
        case 'unlocked':
          return allBadges.filter((b) => b.isUnlocked).length;
        case 'in-progress':
          return allBadges.filter((b) => !b.isUnlocked && b.progress > 0).length;
      }
    },
    [allBadges],
  );

  const handleFilterChange = useCallback((key: FilterTab) => {
    setActiveFilter(key);
    logger.press('FilterTab', { filter: key });
  }, []);

  const handleBadgePress = useCallback((badge: AllBadgeWithProgress) => {
    logger.press('BadgeCard', { badgeId: badge.id, isUnlocked: badge.isUnlocked });
    if (badge.isUnlocked) {
      Alert.alert(
        badge.label,
        `${badge.description || 'Milestone achieved.'}\n\nEarned: ${badge.earnedAt ? new Date(badge.earnedAt).toLocaleDateString() : 'Recently'}${badge.awardedBy ? `\nRecognised by: ${badge.awardedBy}` : ''}`,
        [{ text: 'Close', style: 'cancel' }],
      );
    } else {
      Alert.alert(
        badge.label,
        `${badge.description || 'Keep going to reach this milestone.'}\n\nProgress: ${badge.progressLabel}`,
        [{ text: 'Got it', style: 'cancel' }],
      );
    }
  }, []);

  return {
    currentUser,
    allBadges,
    activeFilter,
    loading: status === 'loading',
    status,
    error: status === 'error' ? (error as ServiceError | null) : null,
    refreshing,
    onRefresh,
    retry,
    filteredBadges,
    filteredBySection,
    stats,
    getFilterCount,
    handleFilterChange,
    handleBadgePress,
  } satisfies {
    currentUser: typeof currentUser;
    allBadges: AllBadgeWithProgress[];
    activeFilter: FilterTab;
    loading: boolean;
    status: ScreenStatus;
    error: ServiceError | null;
    refreshing: boolean;
    onRefresh: () => void;
    retry: () => void;
    filteredBadges: AllBadgeWithProgress[];
    filteredBySection: Map<string, AllBadgeWithProgress[]>;
    stats: { total: number; unlocked: number; points: number };
    getFilterCount: (key: FilterTab) => number;
    handleFilterChange: (key: FilterTab) => void;
    handleBadgePress: (badge: AllBadgeWithProgress) => void;
  };
}
