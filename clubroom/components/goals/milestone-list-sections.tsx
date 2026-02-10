/**
 * Extracted sub-components for MilestoneList.
 *
 * MilestoneItem — animated checkable milestone with spring press + haptics.
 * CompactMilestoneList — read-only compact view (max 3 items).
 */

import React, { memo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
import { Spacing, Radii } from '@/constants/theme';
import type { GoalMilestone } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';
import { scaleFont } from '@/utils/scale';
import { Row } from '@/components/primitives';

// ─── Helpers ────────────────────────────────────────────────────────────────

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function formatCompletedDate(date?: string): string {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// ─── MilestoneItem ──────────────────────────────────────────────────────────

interface MilestoneItemProps {
  milestone: GoalMilestone;
  index: number;
  onToggle: () => void;
  onDelete?: () => void;
  editable: boolean;
  loading: boolean;
}

export const MilestoneItem = memo(function MilestoneItem({
  milestone,
  index,
  onToggle,
  onDelete,
  editable,
  loading,
}: MilestoneItemProps) {
  const { colors: palette } = useTheme();

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
              backgroundColor: milestone.isCompleted ? palette.success : 'transparent',
              borderColor: milestone.isCompleted ? palette.success : palette.border,
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
          <Clickable accessibilityLabel="Delete milestone" onPress={onDelete} hitSlop={8} style={styles.deleteButton}>
            <Ionicons name="trash-outline" size={18} color={palette.error} />
          </Clickable>
        )}
      </AnimatedPressable>
    </Animated.View>
  );
});

// ─── CompactMilestoneList ───────────────────────────────────────────────────

interface CompactMilestoneListProps {
  milestones: GoalMilestone[];
}

export const CompactMilestoneList = memo(function CompactMilestoneList({
  milestones,
}: CompactMilestoneListProps) {
  const { colors: palette } = useTheme();
  const sorted = [...milestones].sort((a, b) => a.order - b.order);

  return (
    <View style={styles.compactContainer}>
      {sorted.slice(0, 3).map((milestone) => (
        <Row key={milestone.id} style={styles.compactItem}>
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
        </Row>
      ))}
      {milestones.length > 3 && (
        <ThemedText style={[styles.moreText, { color: palette.muted }]}>
          +{milestones.length - 3} more
        </ThemedText>
      )}
    </View>
  );
});

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  milestoneItem: {
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
  compactContainer: {
    gap: Spacing.xxs,
  },
  compactItem: {
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
