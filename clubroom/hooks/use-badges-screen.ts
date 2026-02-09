/**
 * Hook for the All Badges screen.
 * Manages badge loading, filtering by status, grouping by section, and stats.
 */

import { useEffect, useMemo, useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/use-auth';
import { badgeService, AllBadgeWithProgress } from '@/services/badge-service';
import { createLogger } from '@/utils/logger';

const logger = createLogger('BadgesScreen');

export const BADGE_TIER_COLORS = {
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
} as const;

export type FilterTab = 'all' | 'unlocked' | 'locked' | 'in-progress';

export const FILTER_TABS: { key: FilterTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'all', label: 'All', icon: 'grid-outline' },
  { key: 'unlocked', label: 'Earned', icon: 'checkmark-circle-outline' },
  { key: 'locked', label: 'Locked', icon: 'lock-closed-outline' },
  { key: 'in-progress', label: 'In Progress', icon: 'time-outline' },
];

export const SECTION_ORDER = [
  'milestones', 'streaks', 'events', 'leadership', 'consistency',
  'technique', 'mindset', 'teamwork', 'resilience',
];

export function useBadgesScreen() {
  const { currentUser } = useAuth();

  const [allBadges, setAllBadges] = useState<AllBadgeWithProgress[]>([]);
  const [badgesByCategory, setBadgesByCategory] = useState<Map<string, AllBadgeWithProgress[]>>(new Map());
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    setIsLoading(true);
    Promise.all([
      badgeService.getAllBadgesWithProgress(currentUser.id),
      badgeService.getBadgesByCategory(currentUser.id),
    ]).then(([badges, grouped]) => {
      setAllBadges(badges);
      setBadgesByCategory(grouped);
      logger.info('badges_loaded', { totalBadges: badges.length, unlockedCount: badges.filter((b) => b.isUnlocked).length });
    }).finally(() => setIsLoading(false));
  }, [currentUser]);

  const filteredBadges = useMemo(() => {
    switch (activeFilter) {
      case 'unlocked': return allBadges.filter((b) => b.isUnlocked);
      case 'locked': return allBadges.filter((b) => !b.isUnlocked && b.progress === 0);
      case 'in-progress': return allBadges.filter((b) => !b.isUnlocked && b.progress > 0);
      default: return allBadges;
    }
  }, [allBadges, activeFilter]);

  const filteredBySection = useMemo(() => {
    if (activeFilter === 'all') return badgesByCategory;
    const grouped = new Map<string, AllBadgeWithProgress[]>();
    filteredBadges.forEach((badge) => {
      const section = badge.badgeType === 'milestone' ? 'milestones'
        : badge.badgeType === 'streak' ? 'streaks'
        : badge.badgeType === 'event' ? 'events'
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

  const getFilterCount = useCallback((key: FilterTab) => {
    switch (key) {
      case 'all': return allBadges.length;
      case 'unlocked': return allBadges.filter((b) => b.isUnlocked).length;
      case 'locked': return allBadges.filter((b) => !b.isUnlocked && b.progress === 0).length;
      case 'in-progress': return allBadges.filter((b) => !b.isUnlocked && b.progress > 0).length;
    }
  }, [allBadges]);

  const handleFilterChange = useCallback((key: FilterTab) => {
    setActiveFilter(key);
    logger.press('FilterTab', { filter: key });
  }, []);

  const handleBadgePress = useCallback((badge: AllBadgeWithProgress) => {
    logger.press('BadgeCard', { badgeId: badge.id, isUnlocked: badge.isUnlocked });
    if (badge.isUnlocked) {
      Alert.alert(badge.label,
        `${badge.description || 'Achievement unlocked!'}\n\nEarned: ${badge.earnedAt ? new Date(badge.earnedAt).toLocaleDateString() : 'Recently'}${badge.awardedBy ? `\nAwarded by: ${badge.awardedBy}` : ''}\nPoints: +${badge.pointValue}`,
        [{ text: 'Close', style: 'cancel' }]);
    } else {
      Alert.alert(`${badge.label} (Locked)`,
        `${badge.description || 'Keep working to unlock this badge!'}\n\nProgress: ${badge.progressLabel}\nPoints when unlocked: +${badge.pointValue}`,
        [{ text: 'Got it', style: 'cancel' }]);
    }
  }, []);

  return {
    currentUser, allBadges, activeFilter, isLoading,
    filteredBadges, filteredBySection, stats,
    getFilterCount, handleFilterChange, handleBadgePress,
  };
}
