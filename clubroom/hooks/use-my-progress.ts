/**
 * useMyProgress — All state, data loading, and handlers for the My Progress screen.
 */
import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import { progressService, type AthleteProgress, type SessionFeedback } from '@/services/progress-service';
import { badgeService } from '@/services/badge-service';
import { createLogger } from '@/utils/logger';
import type { BadgeAward } from '@/constants/types';

const logger = createLogger('MyProgressScreen');

export type ProgressTab = 'overview' | 'skills' | 'feedback' | 'goals' | 'badges' | 'journal' | 'radar';

export const PROGRESS_TABS: { id: ProgressTab; shortLabel: string; icon: string }[] = [
  { id: 'overview', shortLabel: 'Home', icon: 'grid-outline' },
  { id: 'skills', shortLabel: 'Skills', icon: 'analytics-outline' },
  { id: 'radar', shortLabel: 'Radar', icon: 'stats-chart-outline' },
  { id: 'goals', shortLabel: 'Goals', icon: 'flag-outline' },
  { id: 'journal', shortLabel: 'Journal', icon: 'journal-outline' },
  { id: 'feedback', shortLabel: 'Notes', icon: 'chatbubble-outline' },
  { id: 'badges', shortLabel: 'Awards', icon: 'ribbon-outline' },
];

export function useMyProgress() {
  const { currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [progress, setProgress] = useState<AthleteProgress | null>(null);
  const [feedback, setFeedback] = useState<SessionFeedback[]>([]);
  const [badges, setBadges] = useState<BadgeAward[]>([]);
  const [activeTab, setActiveTab] = useState<ProgressTab>('overview');
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');

  const loadData = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const progressData = await progressService.getAthleteProgress(currentUser.id, 'athlete');
      progressData.athleteName = currentUser.name || 'Me';
      setProgress(progressData);

      const feedbackData = await progressService.getFeedbackForAthlete(currentUser.id, 'athlete');
      setFeedback(feedbackData);

      const badgesData = await badgeService.listAwardsForAthlete(currentUser.id);
      setBadges(badgesData.filter(b => b.visibility !== 'coach_only'));

      logger.info('My progress loaded', {
        userId: currentUser.id,
        sessionCount: progressData.totalSessions,
        feedbackCount: feedbackData.length,
        badgeCount: badgesData.length,
      });
    } catch (error) {
      logger.error('Failed to load progress', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser?.id, currentUser?.name]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleRefresh = useCallback(() => { setRefreshing(true); loadData(); }, [loadData]);

  const handleCreateGoal = useCallback(async () => {
    if (!newGoalTitle.trim() || !currentUser) return;
    try {
      await progressService.createGoal(currentUser.id, {
        userId: currentUser.id, athleteId: currentUser.id,
        title: newGoalTitle.trim(), category: 'OTHER', progress: 0,
        milestones: [], status: 'ACTIVE', createdBy: 'ATHLETE', createdById: currentUser.id,
      });
      setNewGoalTitle('');
      setShowGoalForm(false);
      loadData();
      Alert.alert('Success', 'Goal created!');
    } catch (error) {
      logger.error('Failed to create goal', error);
      Alert.alert('Error', 'Failed to create goal');
    }
  }, [newGoalTitle, currentUser, loadData]);

  const trendInfo = progress ? (() => {
    switch (progress.overallTrend) {
      case 'improving': return { icon: 'trending-up', color: 'success' as const, label: 'Improving' };
      case 'declining': return { icon: 'trending-down', color: 'error' as const, label: 'Keep Pushing' };
      default: return { icon: 'remove', color: 'muted' as const, label: 'Steady' };
    }
  })() : null;

  return {
    currentUser, loading, refreshing, progress, feedback, badges,
    activeTab, setActiveTab, trendInfo,
    showGoalForm, setShowGoalForm, newGoalTitle, setNewGoalTitle,
    handleRefresh, handleCreateGoal,
  };
}
