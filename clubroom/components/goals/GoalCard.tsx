/**
 * GoalCard Component
 *
 * A card displaying a goal with progress ring, category badge, and milestone preview.
 * Used in goal lists and dashboards to show goal information at a glance.
 */

import { memo } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { ProgressRing } from './ProgressRing';
import { CategoryBadge } from './CategoryBadge';
import { withAlpha } from '@/constants/theme';
import type { Goal } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';
import { progressService } from '@/services/progress-service';

import { GoalCompactCard, GoalFeaturedCard, styles } from './goal-card-sections';

interface GoalCardProps {
  goal: Goal;
  onPress?: () => void;
  variant?: 'default' | 'compact' | 'featured';
  showMilestones?: boolean;
}

export const GoalCard = memo(function GoalCard({
  goal,
  onPress,
  variant = 'default',
  showMilestones = false,
}: GoalCardProps) {
  const { colors: palette } = useTheme();

  if (variant === 'compact') {
    return <GoalCompactCard goal={goal} onPress={onPress} palette={palette} />;
  }

  if (variant === 'featured') {
    return (
      <GoalFeaturedCard
        goal={goal}
        onPress={onPress}
        showMilestones={showMilestones}
        palette={palette}
      />
    );
  }

  const { label: statusLabel, color: statusColor } = progressService.getStatusInfo(goal.status);
  const { color: categoryColor } = progressService.getCategoryInfo(goal.category);
  const isOverdue = progressService.isOverdue(goal);
  const completedMilestones = goal.milestones.filter((m) => m.isCompleted).length;

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
                style={[styles.footerText, { color: isOverdue ? palette.error : palette.muted }]}
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
            <ThemedText style={[styles.statusText, { color: palette.error }]}>Overdue</ThemedText>
          </View>
        )}
      </View>
    </SurfaceCard>
  );
});
