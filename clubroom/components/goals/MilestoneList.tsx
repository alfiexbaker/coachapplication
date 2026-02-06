/**
 * MilestoneList Component
 *
 * A list of checkable milestones that track progress towards a goal.
 * Supports completing/uncompleting milestones with animations and haptic feedback.
 */

import { useCallback, useState } from 'react';
import { View, StyleSheet, Pressable, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeInLeft,
  FadeOutRight,
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  Layout,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Colors, Spacing, Radii } from '@/constants/theme';
import type { GoalMilestone } from '@/constants/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { scaleFont } from '@/utils/scale';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface MilestoneListProps {
  /** Array of milestones to display */
  milestones: GoalMilestone[];
  /** Callback when a milestone is toggled */
  onToggleMilestone?: (milestoneId: string, completed: boolean) => Promise<void> | void;
  /** Callback when a milestone is deleted */
  onDeleteMilestone?: (milestoneId: string) => Promise<void> | void;
  /** Callback when a new milestone is added */
  onAddMilestone?: (title: string) => Promise<void> | void;
  /** Whether milestones can be edited */
  editable?: boolean;
  /** Whether to show the add milestone input */
  showAddInput?: boolean;
  /** Whether operations are in progress */
  loading?: boolean;
  /** Compact mode for display only */
  compact?: boolean;
}

/**
 * A list of checkable milestones with support for adding, completing, and deleting.
 *
 * @example
 * ```tsx
 * <MilestoneList
 *   milestones={goal.milestones}
 *   onToggleMilestone={handleToggle}
 *   onAddMilestone={handleAdd}
 *   editable
 *   showAddInput
 * />
 * ```
 */
export function MilestoneList({
  milestones,
  onToggleMilestone,
  onDeleteMilestone,
  onAddMilestone,
  editable = true,
  showAddInput = false,
  loading = false,
  compact = false,
}: MilestoneListProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Sort milestones by order
  const sortedMilestones = [...milestones].sort((a, b) => a.order - b.order);

  const handleToggle = useCallback(
    async (milestone: GoalMilestone) => {
      if (!editable || loading) return;

      void Haptics.impactAsync(
        milestone.isCompleted
          ? Haptics.ImpactFeedbackStyle.Light
          : Haptics.ImpactFeedbackStyle.Medium
      );

      await onToggleMilestone?.(milestone.id, !milestone.isCompleted);
    },
    [editable, loading, onToggleMilestone]
  );

  const handleDelete = useCallback(
    (milestone: GoalMilestone) => {
      if (!editable || loading) return;

      Alert.alert(
        'Delete Milestone',
        `Are you sure you want to delete "${milestone.title}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              void onDeleteMilestone?.(milestone.id);
            },
          },
        ]
      );
    },
    [editable, loading, onDeleteMilestone]
  );

  const handleAddMilestone = useCallback(async () => {
    if (!newMilestoneTitle.trim() || isAdding) return;

    setIsAdding(true);
    try {
      await onAddMilestone?.(newMilestoneTitle.trim());
      setNewMilestoneTitle('');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } finally {
      setIsAdding(false);
    }
  }, [newMilestoneTitle, isAdding, onAddMilestone]);

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        {sortedMilestones.slice(0, 3).map((milestone) => (
          <View key={milestone.id} style={styles.compactItem}>
            <Ionicons
              name={milestone.isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
              size={14}
              color={milestone.isCompleted ? palette.success : palette.muted}
            />
            <ThemedText
              style={[
                styles.compactText,
                milestone.isCompleted ? styles.completedText : undefined,
                { color: milestone.isCompleted ? palette.muted : palette.text },
              ]}
              numberOfLines={1}
            >
              {milestone.title}
            </ThemedText>
          </View>
        ))}
        {milestones.length > 3 && (
          <ThemedText style={[styles.moreText, { color: palette.muted }]}>
            +{milestones.length - 3} more
          </ThemedText>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {sortedMilestones.map((milestone, index) => (
        <MilestoneItem
          key={milestone.id}
          milestone={milestone}
          index={index}
          onToggle={() => handleToggle(milestone)}
          onDelete={onDeleteMilestone ? () => handleDelete(milestone) : undefined}
          editable={editable}
          loading={loading}
        />
      ))}

      {showAddInput && editable && (
        <Animated.View
          entering={FadeInLeft.springify()}
          style={styles.addInputContainer}
        >
          <TextInput
            style={[
              styles.addInput,
              {
                backgroundColor: palette.surface,
                color: palette.text,
                borderColor: palette.border,
              },
            ]}
            placeholder="Add a milestone..."
            placeholderTextColor={palette.muted}
            value={newMilestoneTitle}
            onChangeText={setNewMilestoneTitle}
            onSubmitEditing={handleAddMilestone}
            returnKeyType="done"
            editable={!isAdding}
          />
          <Clickable
            onPress={handleAddMilestone}
            disabled={!newMilestoneTitle.trim() || isAdding}
            style={[
              styles.addButton,
              {
                backgroundColor: newMilestoneTitle.trim()
                  ? palette.tint
                  : palette.border,
              },
            ]}
          >
            <Ionicons
              name={isAdding ? 'hourglass' : 'add'}
              size={20}
              color={palette.onPrimary}
            />
          </Clickable>
        </Animated.View>
      )}

      {milestones.length === 0 && (
        <View style={[styles.emptyState, { backgroundColor: palette.surfaceSecondary }]}>
          <Ionicons name="flag-outline" size={24} color={palette.muted} />
          <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
            No milestones yet. Add one to track your progress!
          </ThemedText>
        </View>
      )}
    </View>
  );
}

/**
 * Individual milestone item with checkbox and animations
 */
function MilestoneItem({
  milestone,
  index,
  onToggle,
  onDelete,
  editable,
  loading,
}: {
  milestone: GoalMilestone;
  index: number;
  onToggle: () => void;
  onDelete?: () => void;
  editable: boolean;
  loading: boolean;
}) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (editable && !loading) {
      scale.value = withSpring(0.97, { damping: 15 });
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  const formatCompletedDate = (date?: string) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  return (
    <Animated.View
      entering={FadeInLeft.delay(index * 50).springify()}
      exiting={FadeOutRight.springify()}
      layout={Layout.springify()}
    >
      <AnimatedPressable
        style={[styles.milestoneItem, animatedStyle]}
        onPress={onToggle}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={!editable || loading}
      >
        <View
          style={[
            styles.checkbox,
            {
              backgroundColor: milestone.isCompleted
                ? palette.success
                : 'transparent',
              borderColor: milestone.isCompleted
                ? palette.success
                : palette.border,
            },
          ]}
        >
          {milestone.isCompleted && (
            <Ionicons name="checkmark" size={14} color={palette.onPrimary} />
          )}
        </View>

        <View style={styles.milestoneContent}>
          <ThemedText
            style={[
              styles.milestoneTitle,
              milestone.isCompleted ? styles.completedText : undefined,
              { color: milestone.isCompleted ? palette.muted : palette.text },
            ]}
          >
            {milestone.title}
          </ThemedText>
          {milestone.isCompleted && milestone.completedAt && (
            <ThemedText style={[styles.completedDate, { color: palette.muted }]}>
              Completed {formatCompletedDate(milestone.completedAt)}
            </ThemedText>
          )}
        </View>

        {editable && onDelete && (
          <Clickable
            onPress={onDelete}
            hitSlop={8}
            style={styles.deleteButton}
          >
            <Ionicons name="trash-outline" size={18} color={palette.error} />
          </Clickable>
        )}
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
  },
  milestoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    gap: Spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: Radii.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneContent: {
    flex: 1,
    gap: Spacing.micro,
  },
  milestoneTitle: {
    fontSize: scaleFont(15),
    lineHeight: scaleFont(20),
  },
  completedText: {
    textDecorationLine: 'line-through',
  },
  completedDate: {
    fontSize: scaleFont(12),
  },
  deleteButton: {
    padding: Spacing.xs,
  },
  addInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  addInput: {
    flex: 1,
    height: 44,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.sm,
    borderWidth: 1,
    fontSize: scaleFont(15),
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    gap: Spacing.sm,
  },
  emptyText: {
    flex: 1,
    fontSize: scaleFont(14),
  },
  compactContainer: {
    gap: Spacing.xxs,
  },
  compactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  compactText: {
    fontSize: scaleFont(13),
    flex: 1,
  },
  moreText: {
    fontSize: scaleFont(12),
    fontStyle: 'italic',
    marginLeft: 20,
  },
});
