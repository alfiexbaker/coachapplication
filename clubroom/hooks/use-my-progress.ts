/**
 * useMyProgress — All state, data loading, and handlers for the My Progress screen.
 */
import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import {
  progressService,
  type AthleteProgress,
  type SessionFeedback,
} from '@/services/progress-service';
import { badgeService } from '@/services/badge-service';
import { createLogger } from '@/utils/logger';
import type { BadgeAward } from '@/constants/types';
import { err, ok, serviceError, type ServiceError } from '@/types/result';

const logger = createLogger('MyProgressScreen');

export type ProgressTab =
  | 'overview'
  | 'skills'
  | 'feedback'
  | 'goals'
  | 'badges'
  | 'journal'
  | 'radar';

export const PROGRESS_TABS: { id: ProgressTab; shortLabel: string; icon: string }[] = [
  { id: 'overview', shortLabel: 'Home', icon: 'grid-outline' },
  { id: 'skills', shortLabel: 'Skills', icon: 'analytics-outline' },
  { id: 'radar', shortLabel: 'Radar', icon: 'stats-chart-outline' },
  { id: 'goals', shortLabel: 'Goals', icon: 'flag-outline' },
  { id: 'journal', shortLabel: 'Journal', icon: 'journal-outline' },
  { id: 'feedback', shortLabel: 'Notes', icon: 'chatbubble-outline' },
  { id: 'badges', shortLabel: 'Awards', icon: 'ribbon-outline' },
];

interface MyProgressData {
  progress: AthleteProgress | null;
  feedback: SessionFeedback[];
  badges: BadgeAward[];
}

export function useMyProgress() {
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<ProgressTab>('overview');
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');

  const loadData = useCallback(async () => {
    if (!currentUser?.id) {
      return err(serviceError('VALIDATION', 'Missing user context for progress screen.'));
    }

    try {
      const progressData = await progressService.getAthleteProgress(currentUser.id, 'athlete');
      progressData.athleteName = currentUser.name || 'Me';

      const feedbackData = await progressService.getFeedbackForAthlete(currentUser.id, 'athlete');
      const badgesData = await badgeService.listAwardsForAthlete(currentUser.id);
      const visibleBadges = badgesData.filter((badge) => badge.visibility !== 'coach_only');

      logger.info('My progress loaded', {
        userId: currentUser.id,
        sessionCount: progressData.totalSessions,
        feedbackCount: feedbackData.length,
        badgeCount: badgesData.length,
      });

      return ok<MyProgressData>({
        progress: progressData,
        feedback: feedbackData,
        badges: visibleBadges,
      });
    } catch (error) {
      logger.error('Failed to load progress', error);
      return err(serviceError('UNKNOWN', 'Failed to load progress data.', error));
    }
  }, [currentUser?.id, currentUser?.name]);

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<MyProgressData>({
    load: loadData,
    deps: [currentUser?.id],
    isEmpty: (value) => !value.progress,
    refetchOnFocus: true,
  });

  const progress = data?.progress ?? null;
  const feedback = data?.feedback ?? [];
  const badges = data?.badges ?? [];

  const handleCreateGoal = useCallback(async () => {
    if (!newGoalTitle.trim() || !currentUser) return;
    try {
      await progressService.createGoal(currentUser.id, {
        userId: currentUser.id,
        athleteId: currentUser.id,
        title: newGoalTitle.trim(),
        category: 'OTHER',
        progress: 0,
        milestones: [],
        status: 'ACTIVE',
        createdBy: 'ATHLETE',
        createdById: currentUser.id,
      });
      setNewGoalTitle('');
      setShowGoalForm(false);
      onRefresh();
      Alert.alert('Success', 'Goal created!');
    } catch (goalError) {
      logger.error('Failed to create goal', goalError);
      Alert.alert('Error', 'Failed to create goal');
    }
  }, [newGoalTitle, currentUser, onRefresh]);

  const trendInfo = progress
    ? (() => {
        switch (progress.overallTrend) {
          case 'improving':
            return { icon: 'trending-up', color: 'success' as const, label: 'Improving' };
          case 'declining':
            return { icon: 'trending-down', color: 'error' as const, label: 'Keep Pushing' };
          default:
            return { icon: 'remove', color: 'muted' as const, label: 'Steady' };
        }
      })()
    : null;

  return {
    currentUser,
    loading: status === 'loading',
    status,
    error: status === 'error' ? (error as ServiceError | null) : null,
    refreshing,
    onRefresh,
    retry,
    progress,
    feedback,
    badges,
    activeTab,
    setActiveTab,
    trendInfo,
    showGoalForm,
    setShowGoalForm,
    newGoalTitle,
    setNewGoalTitle,
    handleRefresh: onRefresh,
    handleCreateGoal,
  } satisfies {
    currentUser: typeof currentUser;
    loading: boolean;
    status: ScreenStatus;
    error: ServiceError | null;
    refreshing: boolean;
    onRefresh: () => void;
    retry: () => void;
    progress: AthleteProgress | null;
    feedback: SessionFeedback[];
    badges: BadgeAward[];
    activeTab: ProgressTab;
    setActiveTab: (value: ProgressTab) => void;
    trendInfo: { icon: string; color: 'success' | 'error' | 'muted'; label: string } | null;
    showGoalForm: boolean;
    setShowGoalForm: (value: boolean) => void;
    newGoalTitle: string;
    setNewGoalTitle: (value: string) => void;
    handleRefresh: () => void;
    handleCreateGoal: () => Promise<void>;
  };
}
