/**
 * useGoalDetail — All state, data loading, handlers, and celebration logic for the Goal Detail screen.
 */
import { useState, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import type ConfettiCannon from 'react-native-confetti-cannon';
import { useAuth } from '@/hooks/use-auth';
import { progressService } from '@/services/progress-service';
import { createLogger } from '@/utils/logger';
import type { Goal, GoalStatus } from '@/constants/types';
import type { ScreenStatus } from '@/hooks/use-screen';
import { serviceError, type ServiceError } from '@/types/result';

const logger = createLogger('GoalDetailScreen');

export function useGoalDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentUser } = useAuth();

  const [goal, setGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<ServiceError | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const confettiRef = useRef<ConfettiCannon>(null);

  const celebrationScale = useSharedValue(0);
  const celebrationOpacity = useSharedValue(0);

  const celebrationStyle = useAnimatedStyle(() => ({
    transform: [{ scale: celebrationScale.value }],
    opacity: celebrationOpacity.value,
  }));

  const loadGoal = useCallback(async () => {
    if (!id) return;
    setError(null);
    setLoading(true);
    try {
      const data = await progressService.getGoalById(id);
      setGoal(data);
    } catch (loadError) {
      logger.error('Failed to load goal', loadError);
      setGoal(null);
      setError(serviceError('UNKNOWN', 'Failed to load goal details.', loadError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadGoal();
    }, [loadGoal]),
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadGoal();
  }, [loadGoal]);

  const triggerCelebration = useCallback(() => {
    setShowCelebration(true);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    celebrationScale.value = withSequence(
      withSpring(1.2, { damping: 8 }),
      withSpring(1, { damping: 10 }),
    );
    celebrationOpacity.value = withSpring(1);
    confettiRef.current?.start();
    setTimeout(() => {
      celebrationOpacity.value = withSpring(0);
      setTimeout(() => setShowCelebration(false), 300);
    }, 3000);
  }, [celebrationScale, celebrationOpacity]);

  const handleToggleMilestone = useCallback(
    async (milestoneId: string, completed: boolean) => {
      if (!goal) return;
      const previousProgress = goal.progress;
      try {
        const updatedGoal = completed
          ? await progressService.completeMilestone(milestoneId)
          : await progressService.uncompleteMilestone(milestoneId);
        if (updatedGoal) {
          setGoal(updatedGoal);
          if (updatedGoal.status === 'COMPLETED' && previousProgress < 100) {
            triggerCelebration();
          }
        }
      } catch (error) {
        logger.error('Failed to toggle milestone', error);
        Alert.alert('Error', 'Failed to update milestone. Please try again.');
      }
    },
    [goal, triggerCelebration],
  );

  const handleAddMilestone = useCallback(
    async (title: string) => {
      if (!goal) return;
      try {
        const updatedGoal = await progressService.addMilestone(goal.id, title);
        if (updatedGoal) {
          setGoal(updatedGoal);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch (error) {
        logger.error('Failed to add milestone', error);
        Alert.alert('Error', 'Failed to add milestone. Please try again.');
      }
    },
    [goal],
  );

  const handleDeleteMilestone = useCallback(
    async (milestoneId: string) => {
      if (!goal) return;
      try {
        const updatedGoal = await progressService.deleteMilestone(milestoneId);
        if (updatedGoal) setGoal(updatedGoal);
      } catch (error) {
        logger.error('Failed to delete milestone', error);
        Alert.alert('Error', 'Failed to delete milestone. Please try again.');
      }
    },
    [goal],
  );

  const handleStatusChange = useCallback(
    async (newStatus: GoalStatus) => {
      if (!goal) return;
      try {
        const updatedGoal = await progressService.updateGoal(goal.id, { status: newStatus });
        if (updatedGoal) {
          setGoal(updatedGoal);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          if (newStatus === 'COMPLETED') triggerCelebration();
        }
      } catch (error) {
        logger.error('Failed to update goal status', error);
        Alert.alert('Error', 'Failed to update goal. Please try again.');
      }
    },
    [goal, triggerCelebration],
  );

  const handleDelete = useCallback(() => {
    if (!goal) return;
    Alert.alert(
      'Delete Goal',
      `Are you sure you want to delete "${goal.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await progressService.deleteGoal(goal.id);
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.back();
            } catch (error) {
              logger.error('Failed to delete goal', error);
              Alert.alert('Error', 'Failed to delete goal. Please try again.');
            }
          },
        },
      ],
    );
  }, [goal]);

  const isOwner = goal
    ? goal.userId === currentUser?.id || goal.athleteId === currentUser?.id
    : false;
  const status: ScreenStatus =
    loading && !goal ? 'loading' : error && !goal ? 'error' : !goal ? 'empty' : 'success';

  return {
    goal,
    loading,
    status,
    error,
    refreshing,
    retry: loadGoal,
    showCelebration,
    confettiRef,
    celebrationStyle,
    isOwner,
    handleRefresh,
    handleToggleMilestone,
    handleAddMilestone,
    handleDeleteMilestone,
    handleStatusChange,
    handleDelete,
  };
}
