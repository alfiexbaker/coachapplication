import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInRight } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { Goal } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';
import { MilestoneItem } from './goal-progress-sections';
import { Row } from '@/components/primitives';

// Re-export for backward compatibility
export { GoalsSummary } from './goal-progress-sections';

interface GoalProgressProps {
  goal: Goal;
  onPress?: () => void;
  onCompleteMilestone?: (milestoneId: string) => void;
  expanded?: boolean;
}

export function GoalProgress({
  goal,
  onPress,
  onCompleteMilestone,
  expanded = false,
}: GoalProgressProps) {
  const { colors: palette } = useTheme();

  const completedMilestones = goal.milestones.filter((m) => m.isCompleted).length;
  const totalMilestones = goal.milestones.length;
  const isCompleted = goal.status === 'COMPLETED';
  const isAbandoned = goal.status === 'ABANDONED';

  const statusColor = isCompleted ? palette.success : isAbandoned ? palette.muted : palette.tint;

  const daysRemaining = goal.targetDate
    ? Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <SurfaceCard style={styles.container} onPress={onPress}>
      {/* Header */}
      <Row style={styles.header}>
        <View style={styles.headerContent}>
          <Row style={styles.titleRow}>
            {isCompleted && <Ionicons name="checkmark-circle" size={18} color={palette.success} />}
            <ThemedText
              type="defaultSemiBold"
              style={[
                styles.title,
                isAbandoned ? { textDecorationLine: 'line-through' } : undefined,
              ]}
            >
              {goal.title}
            </ThemedText>
          </Row>

          <Row style={styles.metaRow}>
            {goal.createdBy === 'COACH' && (
              <View style={[styles.badge, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
                <ThemedText style={[styles.badgeText, { color: palette.tint }]}>
                  Coach goal
                </ThemedText>
              </View>
            )}
            {daysRemaining !== null && !isCompleted && !isAbandoned && (
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor:
                      daysRemaining < 7
                        ? withAlpha(palette.error, 0.09)
                        : daysRemaining < 14
                          ? withAlpha(palette.warning, 0.09)
                          : withAlpha(palette.muted, 0.09),
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.badgeText,
                    {
                      color:
                        daysRemaining < 7
                          ? palette.error
                          : daysRemaining < 14
                            ? palette.warning
                            : palette.muted,
                    },
                  ]}
                >
                  {daysRemaining > 0 ? `${daysRemaining} days left` : 'Overdue'}
                </ThemedText>
              </View>
            )}
          </Row>
        </View>

        <View style={[styles.progressCircle, { borderColor: statusColor }]}>
          <ThemedText style={[styles.progressText, { color: statusColor }]}>
            {goal.progress}%
          </ThemedText>
        </View>
      </Row>

      {/* Description */}
      <ThemedText
        style={[styles.description, { color: palette.muted }]}
        numberOfLines={expanded ? undefined : 2}
      >
        {goal.description}
      </ThemedText>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBarBg, { backgroundColor: palette.border }]}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${goal.progress}%`, backgroundColor: statusColor },
            ]}
          />
        </View>
        <ThemedText style={[styles.milestoneCount, { color: palette.muted }]}>
          {completedMilestones}/{totalMilestones} milestones
        </ThemedText>
      </View>

      {/* Milestones (expanded view) */}
      {expanded && goal.milestones.length > 0 && (
        <View style={styles.milestonesList}>
          {goal.milestones.map((milestone, index) => (
            <Animated.View key={milestone.id} entering={FadeInRight.delay(index * 50).springify()}>
              <MilestoneItem
                milestone={milestone}
                onComplete={() => onCompleteMilestone?.(milestone.id)}
                disabled={milestone.isCompleted || isCompleted || isAbandoned}
              />
            </Animated.View>
          ))}
        </View>
      )}

      {/* Target Date */}
      {goal.targetDate && (
        <Row style={styles.targetRow}>
          <Ionicons name="calendar-outline" size={14} color={palette.muted} />
          <ThemedText style={[styles.targetText, { color: palette.muted }]}>
            Target:{' '}
            {new Date(goal.targetDate).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </ThemedText>
        </Row>
      )}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.md, gap: Spacing.sm },
  header: {
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  headerContent: { flex: 1, gap: Spacing.xs },
  titleRow: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  title: { ...Typography.body, flex: 1 },
  metaRow: {
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  badgeText: { ...Typography.micro },
  progressCircle: {
    width: 48,
    height: 48,
    borderRadius: Radii.xl,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: { ...Typography.caption },
  description: { ...Typography.small, lineHeight: 18 },
  progressBarContainer: { gap: Spacing.xxs },
  progressBarBg: {
    height: 6,
    borderRadius: Radii.xs,
    overflow: 'hidden',
  },
  progressBarFill: { height: '100%', borderRadius: Radii.xs },
  milestoneCount: { ...Typography.caption, textAlign: 'right' },
  milestonesList: { gap: Spacing.xs, paddingTop: Spacing.xs },
  targetRow: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  targetText: { ...Typography.caption },
});
