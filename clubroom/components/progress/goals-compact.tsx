import { memo, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Clickable } from '@/components/primitives/clickable';
import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { progressService } from '@/services/progress-service';
import type { Goal } from '@/constants/types';

interface GoalsCompactProps {
  activeGoals: Goal[];
  completedGoals: Goal[];
  athleteId: string | null;
  actorId?: string;
  actorRole?: string;
  onRefresh?: () => void;
  onViewAll?: () => void;
}

const GoalProgressBar = memo(function GoalProgressBar({
  progress,
  isNearComplete,
  fillColor,
  trackColor,
  glowColor,
}: {
  progress: number;
  isNearComplete: boolean;
  fillColor: string;
  trackColor: string;
  glowColor: string;
}) {
  const width = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    width.value = withSpring(Math.max(0, Math.min(100, progress)), {
      damping: 16,
      stiffness: 100,
    });
    if (isNearComplete) {
      glow.value = withSpring(1, { damping: 12, stiffness: 80 });
    }
  }, [glow, isNearComplete, progress, width]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
    backgroundColor: fillColor,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value * 0.4,
    borderColor: glowColor,
  }));

  return (
    <Animated.View style={[styles.progressTrack, { backgroundColor: trackColor }, glowStyle]}>
      <Animated.View style={[styles.progressFill, fillStyle]} />
    </Animated.View>
  );
});

function mapCreatorLabel(goal: Goal): string {
  switch (goal.createdBy) {
    case 'COACH':
      return 'Set by coach';
    case 'PARENT':
      return 'Set by parent';
    case 'ATHLETE':
    default:
      return 'Set by you';
  }
}

export const GoalsCompact = memo(function GoalsCompact({
  activeGoals,
  completedGoals,
  athleteId,
  actorId,
  actorRole,
  onRefresh,
  onViewAll,
}: GoalsCompactProps) {
  const { colors } = useTheme();
  const [showCreate, setShowCreate] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const compactItems = useMemo(() => {
    const active = activeGoals.slice(0, 3);
    if (active.length >= 3) {
      return active.map((goal) => ({ goal, completed: false }));
    }
    const completed = completedGoals
      .slice(0, Math.max(0, 3 - active.length))
      .map((goal) => ({ goal, completed: true }));
    return [...active.map((goal) => ({ goal, completed: false })), ...completed];
  }, [activeGoals, completedGoals]);

  const handleCreateGoal = async () => {
    if (!athleteId || !actorId) {
      Alert.alert('Unable to create goal', 'Athlete context is not available.');
      return;
    }
    const title = newGoalTitle.trim();
    if (!title) {
      Alert.alert('Goal title required', 'Add a goal title to continue.');
      return;
    }

    setIsSubmitting(true);
    try {
      await progressService.createGoal(actorId, {
        userId: athleteId,
        athleteId,
        title,
        category: 'OTHER',
        progress: 0,
        milestones: [],
        status: 'ACTIVE',
        createdBy: actorRole === 'PARENT' ? 'PARENT' : actorRole === 'COACH' ? 'COACH' : 'ATHLETE',
        createdById: actorId,
      });

      setNewGoalTitle('');
      setShowCreate(false);
      onRefresh?.();
    } catch (error) {
      Alert.alert('Error', 'Failed to create goal. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SurfaceCard style={styles.card}>
      <Column gap="sm">
        <Row align="center" justify="between">
          <ThemedText style={styles.title}>Goals</ThemedText>
          <Clickable
            style={[styles.addButton, { backgroundColor: withAlpha(colors.tint, 0.1) }]}
            onPress={() => setShowCreate((value) => !value)}
            accessibilityLabel="Add goal"
            accessibilityRole="button"
          >
            <Row align="center" gap="xxs">
              <Ionicons name="add" size={14} color={colors.tint} />
              <ThemedText style={[styles.addText, { color: colors.tint }]}>Add</ThemedText>
            </Row>
          </Clickable>
        </Row>

        {showCreate ? (
          <Column gap="xs">
            <TextInput
              value={newGoalTitle}
              onChangeText={setNewGoalTitle}
              placeholder="Goal title"
              placeholderTextColor={colors.muted}
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                },
              ]}
            />
            <Row gap="xs" justify="end">
              <Clickable
                style={[styles.smallButton, { borderColor: colors.border }]}
                onPress={() => {
                  setShowCreate(false);
                  setNewGoalTitle('');
                }}
                accessibilityLabel="Cancel goal creation"
                accessibilityRole="button"
              >
                <ThemedText style={[styles.smallButtonText, { color: colors.muted }]}>Cancel</ThemedText>
              </Clickable>
              <Clickable
                style={[styles.smallButton, { backgroundColor: colors.tint }]}
                onPress={() => {
                  void handleCreateGoal();
                }}
                disabled={isSubmitting}
                accessibilityLabel="Create goal"
                accessibilityRole="button"
              >
                <ThemedText style={[styles.smallButtonText, { color: colors.onPrimary }]}>
                  {isSubmitting ? 'Saving...' : 'Create'}
                </ThemedText>
              </Clickable>
            </Row>
          </Column>
        ) : null}

        {compactItems.length === 0 ? (
          <ThemedText style={[styles.emptyText, { color: colors.muted }]}>
            No goals yet. Add one to start tracking progress.
          </ThemedText>
        ) : (
          <Column gap="xs">
            {compactItems.map(({ goal, completed }) => (
              <Column key={goal.id} gap="xxs" style={styles.goalRow}>
                <Row align="center" gap="xxs">
                  <Ionicons
                    name={completed ? 'checkmark-circle' : 'flag'}
                    size={14}
                    color={completed ? colors.success : colors.tint}
                  />
                  <ThemedText style={[styles.goalTitle, completed ? styles.goalTitleCompleted : undefined]}>
                    {goal.title}
                  </ThemedText>
                </Row>
                <Row align="center" justify="between">
                  <ThemedText style={[styles.metaText, { color: colors.muted }]}>
                    {completed ? 'Completed recently' : mapCreatorLabel(goal)}
                  </ThemedText>
                  {!completed && goal.progress > 0 ? (
                    <ThemedText style={[styles.metaText, { color: colors.tint }]}>
                      {Math.round(goal.progress)}%
                    </ThemedText>
                  ) : null}
                </Row>
                {!completed ? (
                  <GoalProgressBar
                    progress={goal.progress}
                    isNearComplete={goal.progress >= 80}
                    fillColor={goal.progress >= 75 ? colors.success : colors.tint}
                    trackColor={withAlpha(colors.border, 0.35)}
                    glowColor={goal.progress >= 80 ? withAlpha(colors.success, 0.5) : 'transparent'}
                  />
                ) : null}
              </Column>
            ))}
          </Column>
        )}

        {onViewAll ? (
          <Clickable
            style={styles.viewAllButton}
            onPress={onViewAll}
            accessibilityLabel="View all goals"
            accessibilityRole="button"
          >
            <Row align="center" gap="xxs">
              <ThemedText style={[styles.viewAllText, { color: colors.tint }]}>View all goals</ThemedText>
              <Ionicons name="arrow-forward" size={14} color={colors.tint} />
            </Row>
          </Clickable>
        ) : null}
      </Column>
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: {
    gap: Spacing.sm,
  },
  title: {
    ...Typography.subheading,
    fontWeight: '700',
  },
  addButton: {
    minHeight: 36,
    borderRadius: Radii.pill,
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  addText: {
    ...Typography.caption,
    fontWeight: '700',
  },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.sm,
    ...Typography.bodySmall,
  },
  smallButton: {
    minHeight: 36,
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    justifyContent: 'center',
  },
  smallButtonText: {
    ...Typography.caption,
    fontWeight: '700',
  },
  emptyText: {
    ...Typography.bodySmall,
  },
  goalRow: {
    borderRadius: Radii.md,
    paddingVertical: Spacing.xxs,
  },
  goalTitle: {
    ...Typography.bodySmallSemiBold,
    flex: 1,
  },
  goalTitleCompleted: {
    textDecorationLine: 'line-through',
  },
  metaText: {
    ...Typography.caption,
  },
  progressTrack: {
    height: 8,
    borderRadius: Radii.pill,
    borderWidth: 1,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radii.pill,
  },
  viewAllButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxs,
  },
  viewAllText: {
    ...Typography.bodySmallSemiBold,
  },
});
