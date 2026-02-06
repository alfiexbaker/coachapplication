/**
 * DrillInfoHeader
 *
 * Displays the category badge, difficulty badge, title, due date,
 * and meta information (duration, reps, priority) for a drill detail screen.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { DifficultyBadge } from '@/components/drills/DifficultyBadge';
import { Colors, Spacing, Radii, Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { scaleFont } from '@/utils/scale';
import type { AssignedDrill, Drill } from '@/constants/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CategoryInfo {
  label: string;
  icon: string;
  color: string;
}

interface DrillInfoHeaderProps {
  drill: Drill;
  assignment: AssignedDrill;
  categoryInfo: CategoryInfo;
  isOverdue: boolean;
  isDueSoon: boolean;
  statusColor: string;
  formattedDueDate: string;
  formattedDuration: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function DrillInfoHeaderInner({
  drill,
  assignment,
  categoryInfo,
  isOverdue,
  statusColor,
  formattedDueDate,
  formattedDuration,
}: DrillInfoHeaderProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <View>
      {/* Category and difficulty */}
      <View style={styles.badgeRow}>
        <View style={[styles.categoryBadge, { backgroundColor: withAlpha(categoryInfo.color, 0.12) }]}>
          <Ionicons
            name={categoryInfo.icon as keyof typeof Ionicons.glyphMap}
            size={14}
            color={categoryInfo.color}
          />
          <ThemedText style={[styles.categoryText, { color: categoryInfo.color }]}>
            {categoryInfo.label}
          </ThemedText>
        </View>
        <DifficultyBadge difficulty={drill.difficulty} />
      </View>

      {/* Title */}
      <ThemedText type="title" style={styles.title}>
        {drill.title}
      </ThemedText>

      {/* Due date */}
      <View style={styles.dueDateRow}>
        <Ionicons
          name={assignment.isCompleted ? 'checkmark-circle' : 'calendar-outline'}
          size={18}
          color={statusColor}
        />
        <ThemedText style={[styles.dueDateText, { color: statusColor }]}>
          {assignment.isCompleted
            ? `Completed ${new Date(assignment.completedAt as string).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}`
            : isOverdue
              ? `Overdue: ${formattedDueDate}`
              : `Due ${formattedDueDate}`}
        </ThemedText>
      </View>

      {/* Meta info */}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={16} color={palette.muted} />
          <ThemedText style={[styles.metaText, { color: palette.muted }]}>
            {formattedDuration}
          </ThemedText>
        </View>
        {assignment.repetitions != null && assignment.repetitions > 1 && (
          <View style={styles.metaItem}>
            <Ionicons name="repeat" size={16} color={palette.muted} />
            <ThemedText style={[styles.metaText, { color: palette.muted }]}>
              {assignment.repetitions} sets
            </ThemedText>
          </View>
        )}
        {assignment.priority === 1 && (
          <View style={[styles.priorityBadge, { backgroundColor: withAlpha(palette.error, 0.09) }]}>
            <Ionicons name="alert-circle" size={14} color={palette.error} />
            <ThemedText style={[styles.priorityText, { color: palette.error }]}>
              Priority
            </ThemedText>
          </View>
        )}
      </View>
    </View>
  );
}

export const DrillInfoHeader = React.memo(DrillInfoHeaderInner);

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.xs + Spacing.xxs,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
  categoryText: {
    ...Typography.caption,
    fontSize: scaleFont(Typography.caption.fontSize),
  },
  title: {
    ...Typography.display,
    fontSize: scaleFont(Typography.display.fontSize),
    marginTop: Spacing.md,
    letterSpacing: -0.5,
  },
  dueDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  dueDateText: {
    ...Typography.bodySemiBold,
    fontSize: scaleFont(Typography.bodySemiBold.fontSize),
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  metaText: {
    ...Typography.bodySmall,
    fontSize: scaleFont(Typography.bodySmall.fontSize),
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
  priorityText: {
    ...Typography.caption,
    fontSize: scaleFont(Typography.caption.fontSize),
  },
});
