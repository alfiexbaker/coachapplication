/**
 * useHomeScreen — Data loading and state for the athlete/parent home screen.
 */
import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { hasChildren } from '@/utils/user-helpers';
import { getBookingsForAthlete, formatDate } from '@/constants/mock-data';
import { badgeService } from '@/services/badge-service';
import { socialFeedService } from '@/services/social-feed-service';
import { progressService } from '@/services/progress-service';
import { createLogger } from '@/utils/logger';
import type { BadgeAward, Club } from '@/constants/types';

const logger = createLogger('UserHomeScreen');

export { formatDate };

export function useHomeScreen() {
  const { currentUser } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentBadges, setRecentBadges] = useState<BadgeAward[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [stats, setStats] = useState({ sessions: 0, badges: 0, level: 1 });
  const [streakInfo, setStreakInfo] = useState<{
    currentStreak: number; nextMilestone: number; daysToNextMilestone: number; streakLabel: string;
  } | null>(null);

  const [selectedChildId, setSelectedChildId] = useState<string | null>(() => {
    if (hasChildren(currentUser) && currentUser?.children?.[0]) return currentUser.children[0].childId;
    return null;
  });

  const athleteId = selectedChildId || currentUser?.id;

  const loadData = useCallback(async () => {
    if (!athleteId) return;
    setError(null);
    try {
      const badges = await badgeService.listAwardsForAthlete(athleteId);
      setRecentBadges(badges.slice(0, 3));
      const userClubs = socialFeedService.getUserClubs(currentUser?.id || '');
      setClubs(userClubs);
      const progress = await progressService.getAthleteProgress(athleteId, 'athlete');
      setStats({ sessions: progress.totalSessions, badges: progress.totalBadges, level: progress.currentLevel.level });
      const streak = await badgeService.getStreakInfo(athleteId);
      setStreakInfo(streak);
    } catch (err) {
      logger.error('Failed to load home data', err);
      setError('Failed to load data. Pull down to refresh.');
    } finally { setLoading(false); }
  }, [athleteId, currentUser?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await loadData(); setRefreshing(false);
  }, [loadData]);

  const upcomingBookings = currentUser
    ? getBookingsForAthlete(currentUser.id)
        .filter(b => new Date(b.scheduledAt) > new Date() && b.status === 'CONFIRMED')
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    : [];

  return {
    currentUser, refreshing, loading, error, recentBadges, clubs, stats, streakInfo,
    selectedChildId, setSelectedChildId, onRefresh, upcomingBookings,
  };
}
