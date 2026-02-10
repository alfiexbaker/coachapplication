import { useState, useCallback } from 'react';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';

import { useAuth } from '@/hooks/use-auth';
import { progressService, type AthleteProgress, type SessionFeedback } from '@/services/progress-service';
import { badgeService } from '@/services/badge-service';
import { userService } from '@/services/user-service';
import { createLogger } from '@/utils/logger';
import type { BadgeAward, User } from '@/constants/types';

const logger = createLogger('ChildProgressScreen');

export type ProgressTab = 'overview' | 'skills' | 'feedback' | 'badges' | 'radar';

export const PROGRESS_TABS: { id: ProgressTab; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: 'grid-outline' },
  { id: 'skills', label: 'Skills', icon: 'analytics-outline' },
  { id: 'radar', label: 'Radar', icon: 'stats-chart-outline' },
  { id: 'feedback', label: 'Feedback', icon: 'chatbubble-outline' },
  { id: 'badges', label: 'Badges', icon: 'ribbon-outline' },
];

export function useChildProgress() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [child, setChild] = useState<User | undefined>(undefined);
  const [progress, setProgress] = useState<AthleteProgress | null>(null);
  const [feedback, setFeedback] = useState<SessionFeedback[]>([]);
  const [badges, setBadges] = useState<BadgeAward[]>([]);
  const [activeTab, setActiveTab] = useState<ProgressTab>('overview');

  const loadData = useCallback(async () => {
    if (!childId) return;

    try {
      const childResult = await userService.getUserById(childId);
      const childData = childResult.success ? childResult.data : undefined;
      setChild(childData);
      if (!childResult.success) {
        logger.error('Failed to load child profile', { childId, error: childResult.error });
      }

      const progressData = await progressService.getAthleteProgress(childId, 'parent');
      progressData.athleteName = childData?.name || 'Athlete';
      setProgress(progressData);

      const feedbackData = await progressService.getFeedbackForAthlete(childId, 'parent');
      setFeedback(feedbackData);

      const badgesData = await badgeService.listAwardsForAthlete(childId);
      const visibleBadges = badgesData.filter(b => b.visibility !== 'coach_only');
      setBadges(visibleBadges);

      logger.info('Child progress loaded', {
        childId,
        sessionCount: progressData.totalSessions,
        feedbackCount: feedbackData.length,
        badgeCount: visibleBadges.length,
      });
    } catch (error) {
      logger.error('Failed to load child progress', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [childId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const getTrendInfo = useCallback((palette: { success: string; error: string; muted: string }) => {
    if (!progress) return { icon: 'remove', color: palette.muted, label: 'No Data' };
    switch (progress.overallTrend) {
      case 'improving':
        return { icon: 'trending-up', color: palette.success, label: 'Improving' };
      case 'declining':
        return { icon: 'trending-down', color: palette.error, label: 'Needs Attention' };
      default:
        return { icon: 'remove', color: palette.muted, label: 'Steady Progress' };
    }
  }, [progress]);

  return {
    loading, refreshing, child, progress, feedback, badges,
    activeTab, setActiveTab,
    handleRefresh, getTrendInfo,
  };
}
