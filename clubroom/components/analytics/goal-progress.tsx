import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInRight } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Goal, GoalMilestone } from '@/constants/types';

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
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const completedMilestones = goal.milestones.filter((m) => m.isCompleted).length;
  const totalMilestones = goal.milestones.length;
  const isCompleted = goal.status === 'COMPLETED';
  const isAbandoned = goal.status === 'ABANDONED';

  const statusColor = isCompleted
    ? palette.success
    : isAbandoned
    ? palette.muted
    : palette.tint;

  const daysRemaining = goal.targetDate
    ? Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <SurfaceCard style={styles.container} onPress={onPress}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.titleRow}>
            {isCompleted && (
              <Ionicons name="checkmark-circle" size={18} color={palette.success} />
            )}
            <ThemedText
              type="defaultSemiBold"
              style={[styles.title, isAbandoned && { textDecorationLine: 'line-through' }]}
            >
              {goal.title}
            </ThemedText>
          </View>

          <View style={styles.metaRow}>
            {goal.createdBy === 'COACH' && (
              <View style={[styles.badge, { backgroundColor: `${palette.tint}15` }]}>
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
                        ? `${palette.error}15`
                        : daysRemaining < 14
                        ? `${palette.warning}15`
                        : `${palette.muted}15`,
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
          </View>
        </View>

        {/* Progress Circle */}
        <View style={[styles.progressCircle, { borderColor: statusColor }]}>
          <ThemedText style={[styles.progressText, { color: statusColor }]}>
            {goal.progress}%
          </ThemedText>
        </View>
      </View>

      {/* Description */}
      {goal.description && !expanded && (
        <ThemedText style={[styles.description, { color: palette.muted }]} numberOfLines={2}>
          {goal.description}
        </ThemedText>
      )}

      {expanded && goal.description && (
        <ThemedText style={[styles.description, { color: palette.muted }]}>
          {goal.description}
        </ThemedText>
      )}

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBarBg, { backgroundColor: palette.border }]}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${goal.progress}%`,
                backgroundColor: statusColor,
              },
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
            <Animated.View
              key={milestone.id}
              entering={FadeInRight.delay(index * 50).springify()}
            >
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
        <View style={styles.targetRow}>
          <Ionicons name="calendar-outline" size={14} color={palette.muted} />
          <ThemedText style={[styles.targetText, { color: palette.muted }]}>
            Target:{' '}
            {new Date(goal.targetDate).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </ThemedText>
        </View>
      )}
    </SurfaceCard>
  );
}

// Individual milestone item
interface MilestoneItemProps {
  milestone: GoalMilestone;
  onComplete?: () => void;
  disabled?: boolean;
}

function MilestoneItem({ milestone, onComplete, disabled }: MilestoneItemProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <Clickable
      onPress={onComplete}
      disabled={disabled}
      style={styles.milestoneItem}
    >
      <View
        style={[
          styles.milestoneCheck,
          {
            backgroundColor: milestone.isCompleted ? palette.success : palette.surface,
            borderColor: milestone.isCompleted ? palette.success : palette.border,
          },
        ]}
      >
        {milestone.isCompleted && <Ionicons name="checkmark" size={12} color="#fff" />}
      </View>

      <View style={styles.milestoneContent}>
        <ThemedText
          style={[
            styles.milestoneTitle,
            milestone.isCompleted && {
              textDecorationLine: 'line-through',
              color: palette.muted,
            },
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
}

// Goals summary card
interface GoalsSummaryProps {
  activeGoals: number;
  completedGoals: number;
  onViewAll?: () => void;
}

export function GoalsSummary({ activeGoals, completedGoals, onViewAll }: GoalsSummaryProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <SurfaceCard style={styles.summaryCard}>
      <View style={styles.summaryHeader}>
        <ThemedText type="defaultSemiBold">Goals</ThemedText>
        {onViewAll && (
          <Clickable onPress={onViewAll}>
            <ThemedText style={[styles.viewAllText, { color: palette.tint }]}>
              View all
            </ThemedText>
          </Clickable>
        )}
      </View>

      <View style={styles.summaryStats}>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryIcon, { backgroundColor: `${palette.tint}15` }]}>
            <Ionicons name="flag" size={20} color={palette.tint} />
          </View>
          <ThemedText type="heading">{activeGoals}</ThemedText>
          <ThemedText style={[styles.summaryLabel, { color: palette.muted }]}>
            Active
          </ThemedText>
        </View>

        <View style={[styles.summaryDivider, { backgroundColor: palette.border }]} />

        <View style={styles.summaryItem}>
          <View style={[styles.summaryIcon, { backgroundColor: `${palette.success}15` }]}>
            <Ionicons name="trophy" size={20} color={palette.success} />
          </View>
          <ThemedText type="heading">{completedGoals}</ThemedText>
          <ThemedText style={[styles.summaryLabel, { color: palette.muted }]}>
            Completed
          </ThemedText>
        </View>
      </View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  headerContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  title: {
    flex: 1,
    fontSize: 15,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  progressCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700',
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  progressBarContainer: {
    gap: 4,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  milestoneCount: {
    fontSize: 11,
    textAlign: 'right',
  },
  milestonesList: {
    gap: Spacing.xs,
    paddingTop: Spacing.xs,
  },
  milestoneItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  milestoneCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneContent: {
    flex: 1,
    gap: 2,
  },
  milestoneTitle: {
    fontSize: 13,
  },
  milestoneDate: {
    fontSize: 11,
  },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  targetText: {
    fontSize: 12,
  },
  summaryCard: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
  },
  summaryStats: {
    flexDirection: 'row',
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
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLabel: {
    fontSize: 11,
  },
  summaryDivider: {
    width: 1,
    height: 48,
  },
});
