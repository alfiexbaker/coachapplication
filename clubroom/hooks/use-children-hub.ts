/**
 * useChildrenHub — Data loading hook for the Children Hub screen.
 *
 * Loads child profiles, per-child stats (sessions, badges, rating),
 * and recent badge awards across all children.
 */

import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';

import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/services/api-client';
import { childService, type ChildProfile } from '@/services/child-service';
import { badgeService } from '@/services/badge-service';
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

  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [childStats, setChildStats] = useState<Record<string, ChildStats>>({});
  const [recentBadges, setRecentBadges] = useState<BadgeAward[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);

    const childrenData = await childService.getChildren(currentUser.id);
    setChildren(childrenData);

    const stats: Record<string, ChildStats> = {};
    const allRecentBadges: BadgeAward[] = [];
    const sessions = await apiClient.get<Session[]>('coach_sessions', []);

    for (const child of childrenData) {
      const childSessions = sessions.filter((session) => session.athleteId === child.id);
      const awards = await badgeService.listAwardsForAthlete(child.id);
      const unseenCount = await badgeService.getUnseenBadgeCount(child.id);
      const avgRating = childSessions.length > 0
        ? childSessions.reduce((sum, session) => sum + session.performanceRating, 0) / childSessions.length
        : 0;

      const visibleAwards = awards.filter(a => a.visibility !== 'coach_only');

      stats[child.id] = {
        sessions: childSessions.length,
        badges: visibleAwards.length,
        avgRating,
        unseenBadges: unseenCount,
      };

      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const recentAwards = visibleAwards.filter(
        a => new Date(a.awardedAt).getTime() > weekAgo,
      );
      allRecentBadges.push(...recentAwards);
    }

    allRecentBadges.sort(
      (a, b) => new Date(b.awardedAt).getTime() - new Date(a.awardedAt).getTime(),
    );
    setRecentBadges(allRecentBadges.slice(0, 5));
    setChildStats(stats);
    setLoading(false);
  }, [currentUser?.id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const handleViewBadge = useCallback(async (badge: BadgeAward) => {
    if (!badge.seenByParent) {
      await badgeService.markSeenByParent(badge.id);
      loadData();
    }
  }, [loadData]);

  // Aggregate stats
  const totalSessions = Object.values(childStats).reduce((sum, s) => sum + s.sessions, 0);
  const totalBadges = Object.values(childStats).reduce((sum, s) => sum + s.badges, 0);
  const totalUnseenBadges = Object.values(childStats).reduce((sum, s) => sum + s.unseenBadges, 0);

  return {
    currentUser,
    children,
    childStats,
    recentBadges,
    loading,
    totalSessions,
    totalBadges,
    totalUnseenBadges,
    handleViewBadge,
    loadData,
  };
}
