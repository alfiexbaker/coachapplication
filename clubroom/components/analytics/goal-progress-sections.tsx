/**
 * Extracted sub-components for GoalProgress.
 *
 * MilestoneItem — individual milestone row with checkbox.
 * GoalsSummary — active/completed goals summary card.
 */

import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { GoalMilestone } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

import { Row } from '@/components/primitives';

// ─── MilestoneItem ───────────────────────────────────────────────────────────

interface MilestoneItemProps {
  milestone: GoalMilestone;
  onComplete?: () => void;
  disabled?: boolean;
}

export const MilestoneItem = memo(function MilestoneItem({
  milestone,
  onComplete,
  disabled,
}: MilestoneItemProps) {
  const { colors: palette } = useTheme();

  return (
    <Clickable onPress={onComplete} disabled={disabled} style={styles.milestoneItem}>
      <View
        style={[
          styles.milestoneCheck,
          {
            backgroundColor: milestone.isCompleted ? palette.success : palette.surface,
            borderColor: milestone.isCompleted ? palette.success : palette.border,
          },
        ]}
      >
        {milestone.isCompleted && <Ionicons name="checkmark" size={12} color={palette.onPrimary} />}
      </View>

      <View style={styles.milestoneContent}>
        <ThemedText
          style={[
            styles.milestoneTitle,
            milestone.isCompleted
              ? {
                  textDecorationLine: 'line-through',
                  color: palette.muted,
                }
              : undefined,
          ]}
        >
          {milestone.title}
        </ThemedText>
        {milestone.completedAt && (
          <ThemedText style={[styles.milestoneDate, { color: palette.muted }]}>
            Completed{' '}
            {new Date(milestone.completedAt).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
            })}
          </ThemedText>
        )}
      </View>
    </Clickable>
  );
});

// ─── GoalsSummary ────────────────────────────────────────────────────────────

interface GoalsSummaryProps {
  activeGoals: number;
  completedGoals: number;
  onViewAll?: () => void;
}

export function GoalsSummary({ activeGoals, completedGoals, onViewAll }: GoalsSummaryProps) {
  const { colors: palette } = useTheme();

  return (
    <SurfaceCard style={styles.summaryCard}>
      <Row style={styles.summaryHeader}>
        <ThemedText type="defaultSemiBold">Goals</ThemedText>
        {onViewAll && (
          <Clickable onPress={onViewAll}>
            <ThemedText style={[styles.viewAllText, { color: palette.tint }]}>View all</ThemedText>
          </Clickable>
        )}
      </Row>

      <Row style={styles.summaryStats}>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryIcon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
            <Ionicons name="flag" size={20} color={palette.tint} />
          </View>
          <ThemedText type="heading">{activeGoals}</ThemedText>
          <ThemedText style={[styles.summaryLabel, { color: palette.muted }]}>Active</ThemedText>
        </View>

        <View style={[styles.summaryDivider, { backgroundColor: palette.border }]} />

        <View style={styles.summaryItem}>
          <View style={[styles.summaryIcon, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
            <Ionicons name="trophy" size={20} color={palette.success} />
          </View>
          <ThemedText type="heading">{completedGoals}</ThemedText>
          <ThemedText style={[styles.summaryLabel, { color: palette.muted }]}>Completed</ThemedText>
        </View>
      </Row>
    </SurfaceCard>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  milestoneItem: {
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  milestoneCheck: {
    width: 20,
    height: 20,
    borderRadius: Radii.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneContent: {
    flex: 1,
    gap: Spacing.micro,
  },
  milestoneTitle: { ...Typography.small },
  milestoneDate: { ...Typography.caption },
  summaryCard: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  summaryHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewAllText: { ...Typography.smallSemiBold },
  summaryStats: {
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  summaryIcon: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLabel: { ...Typography.caption },
  summaryDivider: {
    width: 1,
    height: 48,
  },
});
