import { useState, useCallback } from 'react';
import { useLocalSearchParams } from 'expo-router';

import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import {
  progressService,
  type AthleteProgress,
  type SessionFeedback,
} from '@/services/progress-service';
import { badgeService } from '@/services/badge-service';
import { userService } from '@/services/user-service';
import { createLogger } from '@/utils/logger';
import type { BadgeAward, User } from '@/constants/types';
import { err, ok, serviceError, type ServiceError } from '@/types/result';

const logger = createLogger('ChildProgressScreen');

export type ProgressTab = 'overview' | 'skills' | 'feedback' | 'badges' | 'radar';

export const PROGRESS_TABS: { id: ProgressTab; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: 'grid-outline' },
  { id: 'skills', label: 'Skills', icon: 'analytics-outline' },
  { id: 'radar', label: 'Radar', icon: 'stats-chart-outline' },
  { id: 'feedback', label: 'Feedback', icon: 'chatbubble-outline' },
  { id: 'badges', label: 'Badges', icon: 'ribbon-outline' },
];

interface ChildProgressData {
  child: User | undefined;
  progress: AthleteProgress | null;
  feedback: SessionFeedback[];
  badges: BadgeAward[];
}

export function useChildProgress() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  useAuth();

  const [activeTab, setActiveTab] = useState<ProgressTab>('overview');

  const loadData = useCallback(async () => {
    if (!childId) {
      return err(serviceError('VALIDATION', 'Missing child id for progress screen.'));
    }

    try {
      const childResult = await userService.getUserById(childId);
      const childData = childResult.success ? childResult.data : undefined;
      if (!childResult.success) {
        logger.error('Failed to load child profile', { childId, error: childResult.error });
      }

      const progressData = await progressService.getAthleteProgress(childId, 'parent');
      progressData.athleteName = childData?.name || 'Athlete';

      const feedbackData = await progressService.getFeedbackForAthlete(childId, 'parent');
      const badgesData = await badgeService.listAwardsForAthlete(childId);
      const visibleBadges = badgesData.filter((badge) => badge.visibility !== 'coach_only');

      logger.info('Child progress loaded', {
        childId,
        sessionCount: progressData.totalSessions,
        feedbackCount: feedbackData.length,
        badgeCount: visibleBadges.length,
      });

      return ok<ChildProgressData>({
        child: childData,
        progress: progressData,
        feedback: feedbackData,
        badges: visibleBadges,
      });
    } catch (error) {
      logger.error('Failed to load child progress', error);
      return err(serviceError('UNKNOWN', 'Failed to load child progress data.', error));
    }
  }, [childId]);

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<ChildProgressData>({
    load: loadData,
    deps: [childId],
    isEmpty: (value) => !value.child,
    refetchOnFocus: true,
  });

  const child = data?.child;
  const progress = data?.progress ?? null;
  const feedback = data?.feedback ?? [];
  const badges = data?.badges ?? [];

  const getTrendInfo = useCallback(
    (palette: { success: string; error: string; muted: string }) => {
      if (!progress) return { icon: 'remove', color: palette.muted, label: 'No Data' };
      switch (progress.overallTrend) {
        case 'improving':
          return { icon: 'trending-up', color: palette.success, label: 'Improving' };
        case 'declining':
          return { icon: 'trending-down', color: palette.error, label: 'Needs Attention' };
        default:
          return { icon: 'remove', color: palette.muted, label: 'Steady Progress' };
      }
    },
    [progress],
  );

  return {
    loading: status === 'loading',
    status,
    error: status === 'error' ? (error as ServiceError | null) : null,
    refreshing,
    onRefresh,
    retry,
    child,
    progress,
    feedback,
    badges,
    activeTab,
    setActiveTab,
    handleRefresh: onRefresh,
    getTrendInfo,
  } satisfies {
    loading: boolean;
    status: ScreenStatus;
    error: ServiceError | null;
    refreshing: boolean;
    onRefresh: () => void;
    retry: () => void;
    child: User | undefined;
    progress: AthleteProgress | null;
    feedback: SessionFeedback[];
    badges: BadgeAward[];
    activeTab: ProgressTab;
    setActiveTab: (value: ProgressTab) => void;
    handleRefresh: () => void;
    getTrendInfo: (palette: { success: string; error: string; muted: string }) => {
      icon: string;
      color: string;
      label: string;
    };
  };
}
