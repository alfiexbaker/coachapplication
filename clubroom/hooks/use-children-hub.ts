import { useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useChildContext } from '@/hooks/use-child-context';
import { useScreen } from '@/hooks/use-screen';
import { childService, type ChildProfile } from '@/services/child-service';
import { badgeService } from '@/services/badge-service';
import { analyticsQueryService } from '@/services/analytics/analytics-query-service';
import { err, ok, serviceError } from '@/types/result';
import { createLogger } from '@/utils/logger';
import type { BadgeAward } from '@/constants/types';
import { uiFeedback } from '@/services/ui-feedback';

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
  const {
    children: contextChildren,
    activeChildId,
    setActiveChildId: contextSetActiveChildId,
    refresh: refreshContext,
  } = useChildContext();
  const contextChildrenSignature = contextChildren
    .map((child) => `${child.id}:${child.profile?.id ?? ''}:${child.name}`)
    .join('|');

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
      // TRAP 8: context.children is sync, but trust-sensitive profile detail is loaded explicitly.
      const childrenData: ChildProfile[] = (
        await Promise.all(
          contextChildren.map(async (child) => {
            const childId = child.profile?.id ?? child.profileId ?? child.id;
            const fullProfile = await childService.getChild(childId);
            return fullProfile ?? child.profile;
          }),
        )
      ).filter((profile): profile is ChildProfile => profile !== null);

      const stats: Record<string, ChildStats> = {};
      const allRecentBadges: BadgeAward[] = [];

      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const childStatEntries = await Promise.all(
        childrenData.map(async (child) => {
          const [analyticsResult, awards, unseenCount] = await Promise.all([
            analyticsQueryService.getAthleteAnalytics(child.id, 'ALL'),
            badgeService.listAwardsForAthlete(child.id),
            badgeService.getUnseenBadgeCount(child.id),
          ]);
          if (!analyticsResult.success || !analyticsResult.data) {
            throw new Error(
              analyticsResult.success
                ? `Athlete analytics missing for ${child.id}`
                : analyticsResult.error.message,
            );
          }
          const analytics = analyticsResult.data;

          const visibleAwards = awards.filter((award) => award.visibility !== 'coach_only');
          const recentAwards = visibleAwards.filter(
            (award) => new Date(award.awardedAt).getTime() > weekAgo,
          );
          return {
            childId: child.id,
            recentAwards,
            stats: {
              sessions: analytics.totalSessions,
              badges: visibleAwards.length,
              avgRating: analytics.averageSessionRating,
              unseenBadges: unseenCount,
            },
          };
        }),
      );
      for (const entry of childStatEntries) {
        stats[entry.childId] = entry.stats;
        allRecentBadges.push(...entry.recentAwards);
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
  }, [contextChildren, currentUser?.id]);

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<ChildrenHubData>({
    load: loadData,
    deps: [contextChildrenSignature, currentUser?.id],
    isEmpty: (value) => value.children.length === 0,
    refetchOnFocus: true,
    loadingStrategy: 'warm-first',
    dataKey: currentUser?.id ? `children-hub:${currentUser.id}` : 'children-hub:signed-out',
  });

  const resolved = data ?? {
    children: [],
    childStats: {},
    recentBadges: [],
    totalSessions: 0,
    totalBadges: 0,
    totalUnseenBadges: 0,
  };

  const handleViewBadge = async (badge: BadgeAward) => {
    if (!badge.seenByParent) {
      await badgeService.markSeenByParent(badge.id);
      onRefresh();
    }
  };

  const handleSetActiveChild = async (childId: string) => {
    await contextSetActiveChildId(childId);
    logger.info('active_child_set', { childId });
  };

  const handleRemoveChild = (childId: string) => {
    const child = resolved.children.find((c) => c.id === childId);
    const displayName = child?.nickname || child?.firstName || 'this child';

    uiFeedback.alert(
      'Remove Child From Account',
      `${displayName} will leave your active family view. The backend keeps the athlete record and audit trail.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            // TRAP 9: mutations stay as service calls, then refresh context
            await childService.deleteChild(childId);
            if (activeChildId === childId) {
              await contextSetActiveChildId(null);
            }
            logger.info('child_removed', { childId, displayName });
            await refreshContext();
            onRefresh();
          },
        },
      ],
    );
  };

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
