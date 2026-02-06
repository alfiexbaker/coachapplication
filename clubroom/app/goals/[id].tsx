/**
 * Goal Details Screen
 *
 * Displays detailed information about a goal including progress,
 * milestones, and actions. Supports editing, completing, and deleting goals.
 * Shows celebration animation when a goal is completed.
 */

import { useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeInDown,
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import ConfettiCannon from 'react-native-confetti-cannon';

import { ThemedText } from '@/components/themed-text';
import { createLogger } from '@/utils/logger';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { SurfaceCard } from '@/components/primitives/surface-card';
import {
  ProgressRing,
  MilestoneList,
  CategoryBadge,
} from '@/components/goals';
import { Colors, Spacing, Radii, Typography } from '@/constants/theme';
import type { Goal, GoalStatus } from '@/constants/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { progressService } from '@/services/progress-service';
import { scaleFont } from '@/utils/scale';

const logger = createLogger('GoalDetailScreen');

/**
 * Goal details screen showing progress, milestones, and actions.
 */
export default function GoalDetailScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();

  // State
  const [goal, setGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const confettiRef = useRef<ConfettiCannon>(null);

  // Animation values
  const celebrationScale = useSharedValue(0);
  const celebrationOpacity = useSharedValue(0);

  // Load goal data
  const loadGoal = useCallback(async () => {
    if (!id) return;
    try {
      const data = await progressService.getGoalById(id);
      setGoal(data);
    } catch (error) {
      logger.error('Failed to load goal', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  // Reload on focus
  useFocusEffect(
    useCallback(() => {
      loadGoal();
    }, [loadGoal])
  );

  // Pull to refresh
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadGoal();
  }, [loadGoal]);

  // Show celebration when goal is completed
  const triggerCelebration = useCallback(() => {
    setShowCelebration(true);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    celebrationScale.value = withSequence(
      withSpring(1.2, { damping: 8 }),
      withSpring(1, { damping: 10 })
    );
    celebrationOpacity.value = withSpring(1);

    // Fire confetti
    confettiRef.current?.start();

    // Hide celebration after delay
    setTimeout(() => {
      celebrationOpacity.value = withSpring(0);
      setTimeout(() => setShowCelebration(false), 300);
    }, 3000);
  }, [celebrationScale, celebrationOpacity]);

  // Handle milestone toggle
  const handleToggleMilestone = useCallback(
    async (milestoneId: string, completed: boolean) => {
      if (!goal) return;

      const previousProgress = goal.progress;

      try {
        let updatedGoal: Goal | null;
        if (completed) {
          updatedGoal = await progressService.completeMilestone(milestoneId);
        } else {
          updatedGoal = await progressService.uncompleteMilestone(milestoneId);
        }

        if (updatedGoal) {
          setGoal(updatedGoal);

          // Check if goal was just completed
          if (updatedGoal.status === 'COMPLETED' && previousProgress < 100) {
            triggerCelebration();
          }
        }
      } catch (error) {
        logger.error('Failed to toggle milestone', error);
        Alert.alert('Error', 'Failed to update milestone. Please try again.');
      }
    },
    [goal, triggerCelebration]
  );

  // Handle add milestone
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
    [goal]
  );

  // Handle delete milestone
  const handleDeleteMilestone = useCallback(
    async (milestoneId: string) => {
      if (!goal) return;

      try {
        const updatedGoal = await progressService.deleteMilestone(milestoneId);
        if (updatedGoal) {
          setGoal(updatedGoal);
        }
      } catch (error) {
        logger.error('Failed to delete milestone', error);
        Alert.alert('Error', 'Failed to delete milestone. Please try again.');
      }
    },
    [goal]
  );

  // Handle goal status change
  const handleStatusChange = useCallback(
    async (newStatus: GoalStatus) => {
      if (!goal) return;

      try {
        const updatedGoal = await progressService.updateGoal(goal.id, { status: newStatus });
        if (updatedGoal) {
          setGoal(updatedGoal);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

          if (newStatus === 'COMPLETED') {
            triggerCelebration();
          }
        }
      } catch (error) {
        logger.error('Failed to update goal status', error);
        Alert.alert('Error', 'Failed to update goal. Please try again.');
      }
    },
    [goal, triggerCelebration]
  );

  // Handle delete goal
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
      ]
    );
  }, [goal]);

  // Celebration animation style
  const celebrationStyle = useAnimatedStyle(() => ({
    transform: [{ scale: celebrationScale.value }],
    opacity: celebrationOpacity.value,
  }));

  // Loading state
  if (loading || !goal) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.header}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
        </View>
        <View style={styles.loadingContainer}>
          <ThemedText style={{ color: palette.muted }}>
            {loading ? 'Loading goal...' : 'Goal not found'}
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  const { color: categoryColor } = progressService.getCategoryInfo(goal.category);
  const { label: statusLabel, color: statusColor } = progressService.getStatusInfo(goal.status);
  const isOverdue = progressService.isOverdue(goal);
  const isOwner = goal.userId === currentUser?.id || goal.athleteId === currentUser?.id;
  const completedMilestones = goal.milestones.filter((m) => m.isCompleted).length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Clickable>
        <View style={styles.headerActions}>
          {isOwner && (
            <>
              <Clickable
                onPress={() =>
                  router.push(Routes.GOALS_CREATE)
                }
                hitSlop={8}
              >
                <Ionicons name="pencil-outline" size={22} color={palette.text} />
              </Clickable>
              <Clickable onPress={handleDelete} hitSlop={8}>
                <Ionicons name="trash-outline" size={22} color={palette.error} />
              </Clickable>
            </>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Progress Hero */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.heroSection}>
          <View style={styles.heroContent}>
            <CategoryBadge category={goal.category} />
            <ThemedText type="title" style={styles.goalTitle}>
              {goal.title}
            </ThemedText>
            {goal.description && (
              <ThemedText style={[styles.goalDescription, { color: palette.muted }]}>
                {goal.description}
              </ThemedText>
            )}
          </View>
          <ProgressRing
            progress={goal.progress}
            size={100}
            strokeWidth={10}
            progressColor={goal.status === 'COMPLETED' ? palette.success : categoryColor}
          />
        </Animated.View>

        {/* Status and Meta */}
        <Animated.View entering={FadeInDown.delay(150).springify()}>
          <SurfaceCard style={styles.metaCard}>
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="flag-outline" size={20} color={palette.icon} />
                <View>
                  <ThemedText style={[styles.metaLabel, { color: palette.muted }]}>
                    Milestones
                  </ThemedText>
                  <ThemedText type="defaultSemiBold">
                    {completedMilestones} / {goal.milestones.length}
                  </ThemedText>
                </View>
              </View>

              <View style={styles.metaDivider} />

              <View style={styles.metaItem}>
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={isOverdue ? palette.error : palette.icon}
                />
                <View>
                  <ThemedText style={[styles.metaLabel, { color: palette.muted }]}>
                    {isOverdue ? 'Overdue' : 'Target'}
                  </ThemedText>
                  <ThemedText
                    type="defaultSemiBold"
                    style={{ color: isOverdue ? palette.error : palette.text }}
                  >
                    {progressService.formatTargetDate(goal.targetDate)}
                  </ThemedText>
                </View>
              </View>

              <View style={styles.metaDivider} />

              <View style={styles.metaItem}>
                <Ionicons
                  name={goal.status === 'COMPLETED' ? 'checkmark-circle' : 'ellipse-outline'}
                  size={20}
                  color={statusColor}
                />
                <View>
                  <ThemedText style={[styles.metaLabel, { color: palette.muted }]}>
                    Status
                  </ThemedText>
                  <ThemedText type="defaultSemiBold" style={{ color: statusColor }}>
                    {statusLabel}
                  </ThemedText>
                </View>
              </View>
            </View>
          </SurfaceCard>
        </Animated.View>

        {/* Milestones */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Milestones
          </ThemedText>
          <SurfaceCard style={styles.milestonesCard}>
            <MilestoneList
              milestones={goal.milestones}
              onToggleMilestone={isOwner ? handleToggleMilestone : undefined}
              onDeleteMilestone={isOwner ? handleDeleteMilestone : undefined}
              onAddMilestone={isOwner ? handleAddMilestone : undefined}
              editable={isOwner && goal.status === 'ACTIVE'}
              showAddInput={isOwner && goal.status === 'ACTIVE'}
            />
          </SurfaceCard>
        </Animated.View>

        {/* Actions */}
        {isOwner && (
          <Animated.View entering={FadeInDown.delay(250).springify()} style={styles.actionsSection}>
            {goal.status === 'ACTIVE' && (
              <View style={styles.actionButtons}>
                <Button
                  variant="outline"
                  onPress={() => handleStatusChange('PAUSED')}
                  style={styles.actionButton}
                >
                  <View style={styles.buttonContent}>
                    <Ionicons name="pause-outline" size={18} color={palette.text} />
                    <ThemedText style={styles.buttonText}>Pause Goal</ThemedText>
                  </View>
                </Button>
                <Button
                  onPress={() => handleStatusChange('COMPLETED')}
                  style={[styles.actionButton, { backgroundColor: palette.success }]}
                >
                  <View style={styles.buttonContent}>
                    <Ionicons name="checkmark-circle-outline" size={18} color={Colors.light.onPrimary} />
                    <ThemedText style={[styles.buttonText, { color: Colors.light.onPrimary }]}>
                      Complete Goal
                    </ThemedText>
                  </View>
                </Button>
              </View>
            )}

            {goal.status === 'PAUSED' && (
              <View style={styles.actionButtons}>
                <Button
                  onPress={() => handleStatusChange('ACTIVE')}
                  style={styles.actionButton}
                >
                  <View style={styles.buttonContent}>
                    <Ionicons name="play-outline" size={18} color={Colors.light.onPrimary} />
                    <ThemedText style={[styles.buttonText, { color: Colors.light.onPrimary }]}>
                      Resume Goal
                    </ThemedText>
                  </View>
                </Button>
                <Button
                  variant="outline"
                  onPress={() => handleStatusChange('ABANDONED')}
                  style={styles.actionButton}
                >
                  <View style={styles.buttonContent}>
                    <Ionicons name="close-circle-outline" size={18} color={palette.error} />
                    <ThemedText style={[styles.buttonText, { color: palette.error }]}>
                      Abandon
                    </ThemedText>
                  </View>
                </Button>
              </View>
            )}

            {goal.status === 'COMPLETED' && (
              <SurfaceCard
                style={styles.completedCard}
                outlineGradient={[palette.success, palette.tint]}
              >
                <View style={styles.completedContent}>
                  <Ionicons name="trophy" size={32} color={palette.success} />
                  <View style={styles.completedText}>
                    <ThemedText type="defaultSemiBold" style={{ color: palette.success }}>
                      Goal Achieved!
                    </ThemedText>
                    <ThemedText style={[styles.completedSubtext, { color: palette.muted }]}>
                      Congratulations on completing this goal!
                    </ThemedText>
                  </View>
                </View>
              </SurfaceCard>
            )}
          </Animated.View>
        )}

        {/* Created info */}
        <View style={styles.createdInfo}>
          <ThemedText style={[styles.createdText, { color: palette.muted }]}>
            Created by {goal.createdBy.toLowerCase()} on{' '}
            {new Date(goal.createdAt).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </ThemedText>
        </View>
      </ScrollView>

      {/* Celebration Overlay */}
      {showCelebration && (
        <Modal transparent visible={showCelebration} animationType="none">
          <Animated.View
            entering={FadeIn}
            exiting={FadeOut}
            style={[styles.celebrationOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
          >
            <Animated.View style={[styles.celebrationContent, celebrationStyle]}>
              <View style={[styles.celebrationIcon, { backgroundColor: palette.success }]}>
                <Ionicons name="trophy" size={48} color={Colors.light.onPrimary} />
              </View>
              <ThemedText type="title" style={styles.celebrationTitle}>
                Goal Achieved!
              </ThemedText>
              <ThemedText style={[styles.celebrationSubtitle, { color: palette.muted }]}>
                Congratulations on completing &quot;{goal.title}&quot;
              </ThemedText>
            </Animated.View>
            <ConfettiCannon
              ref={confettiRef}
              count={100}
              origin={{ x: -10, y: 0 }}
              autoStart={false}
              fadeOut
              explosionSpeed={350}
              fallSpeed={3000}
            />
          </Animated.View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  heroSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  heroContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  goalTitle: {
    ...Typography.display, fontSize: scaleFont(Typography.display.fontSize),
    marginTop: Spacing.xs,
  },
  goalDescription: {
    ...Typography.body, fontSize: scaleFont(Typography.body.fontSize),
    lineHeight: scaleFont(22),
  },
  metaCard: {
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  metaLabel: {
    ...Typography.caption, fontSize: scaleFont(Typography.caption.fontSize),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metaDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.light.border,
    marginHorizontal: Spacing.sm,
  },
  section: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
  },
  milestonesCard: {
    padding: Spacing.md,
  },
  actionsSection: {
    marginBottom: Spacing.md,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxs,
  },
  buttonText: {
    fontWeight: '600',
  },
  completedCard: {
    padding: Spacing.lg,
  },
  completedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  completedText: {
    flex: 1,
    gap: Spacing.micro,
  },
  completedSubtext: {
    ...Typography.small, fontSize: scaleFont(Typography.small.fontSize),
  },
  createdInfo: {
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    marginTop: Spacing.md,
  },
  createdText: {
    ...Typography.caption, fontSize: scaleFont(Typography.caption.fontSize),
    textAlign: 'center',
  },
  celebrationOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  celebrationContent: {
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.xl,
    backgroundColor: Colors.light.surface,
    borderRadius: Radii.xl,
    marginHorizontal: Spacing.xl,
  },
  celebrationIcon: {
    width: 80,
    height: 80,
    borderRadius: Radii['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  celebrationTitle: {
    textAlign: 'center',
  },
  celebrationSubtitle: {
    textAlign: 'center',
    ...Typography.body, fontSize: scaleFont(Typography.body.fontSize),
  },
});
