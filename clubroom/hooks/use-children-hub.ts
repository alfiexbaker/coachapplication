/**
 * useChildrenHub — Data loading hook for the Children Hub screen.
 *
 * Loads child profiles, per-child stats (sessions, badges, rating),
 * recent badge awards, and active child state.
 */

import { useCallback, useState, useEffect } from 'react';
import { Alert } from 'react-native';

import { useAuth } from '@/hooks/use-auth';
import { useScreen } from '@/hooks/use-screen';
import { apiClient } from '@/services/api-client';
import { childService, type ChildProfile } from '@/services/child-service';
import { badgeService } from '@/services/badge-service';
import { err, ok, serviceError } from '@/types/result';
import { createLogger } from '@/utils/logger';
import type { BadgeAward } from '@/constants/types';
import type { Session } from '@/constants/app-types';

const logger = createLogger('useChildrenHub');

// ─── Types ─────────────────────────────────────────────────────────────────────

export type ChildStats = {
  sessions: number;
  badges: number;
  avgRating: number;
  unseenBadges: number;
};

export type ChildrenHubData = {
  children: ChildProfile[];
  childStats: Record<string, ChildStats>;
  recentBadges: BadgeAward[];
  totalSessions: number;
  totalBadges: number;
  totalUnseenBadges: number;
};

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useChildrenHub() {
  const { currentUser } = useAuth();
  const [activeChildId, setActiveChildIdState] = useState<string | null>(null);

  // Load active child ID on mount
  useEffect(() => {
    childService.getActiveChildId().then(setActiveChildIdState);
  }, []);

  const loadData = useCallback(async () => {
    if (!currentUser?.id) {
      return ok<ChildrenHubData>({
        children: [],
        childStats: {},
        recentBadges: [],
        totalSessions: 0,
        totalBadges: 0,
        totalUnseenBadges: 0,
      });
    }

    try {
      const childrenData = await childService.getChildren(currentUser.id);
      const stats: Record<string, ChildStats> = {};
      const allRecentBadges: BadgeAward[] = [];
      const sessions = await apiClient.get<Session[]>('coach_sessions', []);

      for (const child of childrenData) {
        const childSessions = sessions.filter((session) => session.athleteId === child.id);
        const awards = await badgeService.listAwardsForAthlete(child.id);
        const unseenCount = await badgeService.getUnseenBadgeCount(child.id);
        const avgRating =
          childSessions.length > 0
            ? childSessions.reduce((sum, session) => sum + session.performanceRating, 0) /
              childSessions.length
            : 0;

        const visibleAwards = awards.filter((award) => award.visibility !== 'coach_only');
        stats[child.id] = {
          sessions: childSessions.length,
          badges: visibleAwards.length,
          avgRating,
          unseenBadges: unseenCount,
        };

        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const recentAwards = visibleAwards.filter(
          (award) => new Date(award.awardedAt).getTime() > weekAgo,
        );
        allRecentBadges.push(...recentAwards);
      }

      allRecentBadges.sort(
        (a, b) => new Date(b.awardedAt).getTime() - new Date(a.awardedAt).getTime(),
      );

      const totalSessions = Object.values(stats).reduce((sum, value) => sum + value.sessions, 0);
      const totalBadges = Object.values(stats).reduce((sum, value) => sum + value.badges, 0);
      const totalUnseenBadges = Object.values(stats).reduce(
        (sum, value) => sum + value.unseenBadges,
        0,
      );

      // Refresh active child ID
      const storedActiveId = await childService.getActiveChildId();
      setActiveChildIdState(storedActiveId);

      return ok<ChildrenHubData>({
        children: childrenData,
        childStats: stats,
        recentBadges: allRecentBadges.slice(0, 5),
        totalSessions,
        totalBadges,
        totalUnseenBadges,
      });
    } catch (loadError) {
      return err(serviceError('UNKNOWN', 'Failed to load children hub data.', loadError));
    }
  }, [currentUser?.id]);

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<ChildrenHubData>({
    load: loadData,
    deps: [loadData],
    isEmpty: (value) => value.children.length === 0,
    refetchOnFocus: true,
  });

  const resolved = data ?? {
    children: [],
    childStats: {},
    recentBadges: [],
    totalSessions: 0,
    totalBadges: 0,
    totalUnseenBadges: 0,
  };

  const handleViewBadge = useCallback(
    async (badge: BadgeAward) => {
      if (!badge.seenByParent) {
        await badgeService.markSeenByParent(badge.id);
        onRefresh();
      }
    },
    [onRefresh],
  );

  const handleSetActiveChild = useCallback(
    async (childId: string) => {
      const child = resolved.children.find((c) => c.id === childId);
      const name = child ? `${child.firstName} ${child.lastName}` : undefined;
      await childService.setActiveChildId(childId, name);
      setActiveChildIdState(childId);
      logger.info('active_child_set', { childId, name });
    },
    [resolved.children],
  );

  const handleRemoveChild = useCallback(
    (childId: string) => {
      const child = resolved.children.find((c) => c.id === childId);
      const displayName = child?.nickname || child?.firstName || 'this child';

      Alert.alert(
        'Remove Child',
        `Are you sure you want to remove ${displayName} from your account? This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              await childService.deleteChild(childId);
              // Clear active child if it was the removed one
              if (activeChildId === childId) {
                await childService.setActiveChildId(null);
                setActiveChildIdState(null);
              }
              logger.info('child_removed', { childId, displayName });
              onRefresh();
            },
          },
        ],
      );
    },
    [resolved.children, activeChildId, onRefresh],
  );

  return {
    currentUser,
    children: resolved.children,
    childStats: resolved.childStats,
    recentBadges: resolved.recentBadges,
    loading: status === 'loading',
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    totalSessions: resolved.totalSessions,
    totalBadges: resolved.totalBadges,
    totalUnseenBadges: resolved.totalUnseenBadges,
    activeChildId,
    handleViewBadge,
    handleSetActiveChild,
    handleRemoveChild,
    loadData: onRefresh,
  };
}
