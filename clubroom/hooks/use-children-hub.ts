/**
 * useChildrenHub — Data loading hook for the Children Hub screen.
 *
 * Loads child profiles, per-child stats (sessions, badges, rating),
 * and recent badge awards across all children.
 */

import { useCallback } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useScreen } from '@/hooks/use-screen';
import { apiClient } from '@/services/api-client';
import { childService, type ChildProfile } from '@/services/child-service';
import { badgeService } from '@/services/badge-service';
import { err, ok, serviceError } from '@/types/result';
import type { BadgeAward } from '@/constants/types';
import type { Session } from '@/constants/app-types';

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
    handleViewBadge,
    loadData: onRefresh,
  };
}
