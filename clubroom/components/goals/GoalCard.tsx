/**
 * GoalCard Component
 *
 * A card displaying a goal with progress ring, category badge, and milestone preview.
 * Used in goal lists and dashboards to show goal information at a glance.
 */

import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { ProgressRing, CompactProgressRing } from './ProgressRing';
import { CategoryBadge } from './CategoryBadge';
import { MilestoneList } from './MilestoneList';
import { Spacing, Radii, Components , withAlpha } from '@/constants/theme';
import type { Goal } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';
import { progressService } from '@/services/progress-service';
import { scaleFont } from '@/utils/scale';

interface GoalCardProps {
  /** The goal to display */
  goal: Goal;
  /** Callback when the card is pressed */
  onPress?: () => void;
  /** Display variant */
  variant?: 'default' | 'compact' | 'featured';
  /** Whether to show milestone preview */
  showMilestones?: boolean;
}

/**
 * A card displaying goal information with progress and milestones.
 *
 * @example
 * ```tsx
 * <GoalCard goal={goal} onPress={() => navigate(goal.id)} />
 * <GoalCard goal={goal} variant="compact" />
 * <GoalCard goal={goal} variant="featured" showMilestones />
 * ```
 */
export function GoalCard({
  goal,
  onPress,
  variant = 'default',
  showMilestones = false,
}: GoalCardProps) {
  const { colors: palette } = useTheme();

  const { label: statusLabel, color: statusColor } = progressService.getStatusInfo(goal.status);
  const { color: categoryColor } = progressService.getCategoryInfo(goal.category);
  const isOverdue = progressService.isOverdue(goal);
  const completedMilestones = goal.milestones.filter((m) => m.isCompleted).length;

  if (variant === 'compact') {
    return (
      <SurfaceCard style={styles.compactCard} onPress={onPress}>
        <CompactProgressRing progress={goal.progress} color={categoryColor} />

        <View style={styles.compactContent}>
          <View style={styles.compactHeader}>
            <ThemedText type="defaultSemiBold" style={styles.compactTitle} numberOfLines={1}>
              {goal.title}
            </ThemedText>
            <CategoryBadge category={goal.category} size="small" iconOnly />
          </View>

          <View style={styles.compactMeta}>
            {goal.targetDate && (
              <View style={styles.metaItem}>
                <Ionicons
                  name="calendar-outline"
                  size={12}
                  color={isOverdue ? palette.error : palette.muted}
                />
                <ThemedText
                  style={[
                    styles.metaText,
                    { color: isOverdue ? palette.error : palette.muted },
                  ]}
                >
                  {progressService.formatTargetDate(goal.targetDate)}
                </ThemedText>
              </View>
            )}
            <View style={styles.metaItem}>
              <Ionicons name="flag-outline" size={12} color={palette.muted} />
              <ThemedText style={[styles.metaText, { color: palette.muted }]}>
                {completedMilestones}/{goal.milestones.length}
              </ThemedText>
            </View>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={20} color={palette.muted} />
      </SurfaceCard>
    );
  }

  if (variant === 'featured') {
    return (
      <SurfaceCard
        style={styles.featuredCard}
        onPress={onPress}
        outlineGradient={goal.progress === 100 ? [palette.success, palette.tint] : undefined}
      >
        {/* Header */}
        <View style={styles.featuredHeader}>
          <View style={styles.headerLeft}>
            <CategoryBadge category={goal.category} />
            {goal.status !== 'ACTIVE' && (
              <View style={[styles.statusBadge, { backgroundColor: withAlpha(statusColor, 0.12) }]}>
                <ThemedText style={[styles.statusText, { color: statusColor }]}>
                  {statusLabel}
                </ThemedText>
              </View>
            )}
          </View>
          <ProgressRing progress={goal.progress} size={72} progressColor={categoryColor} />
        </View>

        {/* Title and description */}
        <ThemedText type="subtitle" style={styles.featuredTitle}>
          {goal.title}
        </ThemedText>

        {goal.description && (
          <ThemedText style={[styles.description, { color: palette.muted }]} numberOfLines={2}>
            {goal.description}
          </ThemedText>
        )}

        {/* Meta info */}
        <View style={styles.metaRow}>
          {goal.targetDate && (
            <View style={styles.metaItem}>
              <Ionicons
                name="calendar-outline"
                size={16}
                color={isOverdue ? palette.error : palette.icon}
              />
              <ThemedText
                style={[
                  styles.metaLabel,
                  { color: isOverdue ? palette.error : palette.text },
                ]}
              >
                {isOverdue ? 'Overdue: ' : 'Target: '}
                {progressService.formatTargetDate(goal.targetDate)}
              </ThemedText>
            </View>
          )}
          <View style={styles.metaItem}>
            <Ionicons name="flag-outline" size={16} color={palette.icon} />
            <ThemedText style={styles.metaLabel}>
              {completedMilestones} of {goal.milestones.length} milestones
            </ThemedText>
          </View>
        </View>

        {/* Milestone preview */}
        {showMilestones && goal.milestones.length > 0 && (
          <View style={[styles.milestonesPreview, { borderTopColor: palette.border }]}>
            <MilestoneList milestones={goal.milestones} editable={false} compact />
          </View>
        )}
      </SurfaceCard>
    );
  }

  // Default variant
  return (
    <SurfaceCard style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <CategoryBadge category={goal.category} size="small" />
          <ThemedText type="defaultSemiBold" style={styles.title} numberOfLines={2}>
            {goal.title}
          </ThemedText>
        </View>
        <ProgressRing progress={goal.progress} size={56} progressColor={categoryColor} />
      </View>

      {goal.description && (
        <ThemedText style={[styles.description, { color: palette.muted }]} numberOfLines={2}>
          {goal.description}
        </ThemedText>
      )}

      <View style={[styles.footer, { borderTopColor: palette.border }]}>
        <View style={styles.footerLeft}>
          {goal.targetDate && (
            <View style={styles.metaItem}>
              <Ionicons
                name="calendar-outline"
                size={14}
                color={isOverdue ? palette.error : palette.muted}
              />
              <ThemedText
                style={[
                  styles.footerText,
                  { color: isOverdue ? palette.error : palette.muted },
                ]}
              >
                {progressService.formatTargetDate(goal.targetDate)}
              </ThemedText>
            </View>
          )}
          <View style={styles.metaItem}>
            <Ionicons name="flag-outline" size={14} color={palette.muted} />
            <ThemedText style={[styles.footerText, { color: palette.muted }]}>
              {completedMilestones}/{goal.milestones.length}
            </ThemedText>
          </View>
        </View>

        {goal.status !== 'ACTIVE' && (
          <View style={[styles.statusBadge, { backgroundColor: withAlpha(statusColor, 0.12) }]}>
            <ThemedText style={[styles.statusText, { color: statusColor }]}>
              {statusLabel}
            </ThemedText>
          </View>
        )}

        {isOverdue && goal.status === 'ACTIVE' && (
          <View style={[styles.statusBadge, { backgroundColor: withAlpha(palette.error, 0.12) }]}>
            <ThemedText style={[styles.statusText, { color: palette.error }]}>
              Overdue
            </ThemedText>
          </View>
        )}
      </View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Components.card.padding,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  headerContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  title: {
    fontSize: scaleFont(16),
    lineHeight: scaleFont(22),
  },
  description: {
    fontSize: scaleFont(14),
    lineHeight: scaleFont(20),
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    marginTop: Spacing.xs,
  },
  footerLeft: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  footerText: {
    fontSize: scaleFont(12),
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  statusText: {
    fontSize: scaleFont(11),
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // Compact variant
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  compactContent: {
    flex: 1,
    gap: Spacing.xxs,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  compactTitle: {
    flex: 1,
    fontSize: scaleFont(15),
  },
  compactMeta: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  metaText: {
    fontSize: scaleFont(11),
  },

  // Featured variant
  featuredCard: {
    padding: Components.card.padding,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  featuredHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flex: 1,
    flexWrap: 'wrap',
  },
  featuredTitle: {
    fontSize: scaleFont(20),
    marginTop: Spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  metaLabel: {
    fontSize: scaleFont(13),
  },
  milestonesPreview: {
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    marginTop: Spacing.sm,
  },
});
