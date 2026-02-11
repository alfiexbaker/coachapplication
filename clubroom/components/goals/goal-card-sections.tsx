/**
 * Extracted sub-components for GoalCard.
 *
 * GoalCompactCard — compact row variant (memo).
 * GoalFeaturedCard — featured variant with milestone preview (memo).
 */

import React, { memo } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { CompactProgressRing, ProgressRing } from './ProgressRing';
import { CategoryBadge } from './CategoryBadge';
import { MilestoneList } from './MilestoneList';
import { withAlpha } from '@/constants/theme';
import type { Goal } from '@/constants/types';
import type { ThemeColors } from '@/hooks/useTheme';
import { progressService } from '@/services/progress-service';
import { Row } from '@/components/primitives';
import { styles } from './goal-card-styles';

// ─── GoalCompactCard ─────────────────────────────────────────────────────────

interface GoalCompactCardProps {
  goal: Goal;
  onPress?: () => void;
  palette: ThemeColors;
}

export const GoalCompactCard = memo(function GoalCompactCard({
  goal,
  onPress,
  palette,
}: GoalCompactCardProps) {
  const { color: categoryColor } = progressService.getCategoryInfo(goal.category);
  const isOverdue = progressService.isOverdue(goal);
  const completedMilestones = goal.milestones.filter((m) => m.isCompleted).length;

  return (
    <SurfaceCard style={styles.compactCard} onPress={onPress}>
      <CompactProgressRing progress={goal.progress} color={categoryColor} />

      <View style={styles.compactContent}>
        <Row style={styles.compactHeader}>
          <ThemedText type="defaultSemiBold" style={styles.compactTitle} numberOfLines={1}>
            {goal.title}
          </ThemedText>
          <CategoryBadge category={goal.category} size="small" iconOnly />
        </Row>

        <Row style={styles.compactMeta}>
          {goal.targetDate && (
            <Row style={styles.metaItem}>
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
            </Row>
          )}
          <Row style={styles.metaItem}>
            <Ionicons name="flag-outline" size={12} color={palette.muted} />
            <ThemedText style={[styles.metaText, { color: palette.muted }]}>
              {completedMilestones}/{goal.milestones.length}
            </ThemedText>
          </Row>
        </Row>
      </View>

      <Ionicons name="chevron-forward" size={20} color={palette.muted} />
    </SurfaceCard>
  );
});

// ─── GoalFeaturedCard ────────────────────────────────────────────────────────

interface GoalFeaturedCardProps {
  goal: Goal;
  onPress?: () => void;
  showMilestones: boolean;
  palette: ThemeColors;
}

export const GoalFeaturedCard = memo(function GoalFeaturedCard({
  goal,
  onPress,
  showMilestones,
  palette,
}: GoalFeaturedCardProps) {
  const { label: statusLabel, color: statusColor } = progressService.getStatusInfo(goal.status);
  const { color: categoryColor } = progressService.getCategoryInfo(goal.category);
  const isOverdue = progressService.isOverdue(goal);
  const completedMilestones = goal.milestones.filter((m) => m.isCompleted).length;

  return (
    <SurfaceCard
      style={styles.featuredCard}
      onPress={onPress}
      outlineGradient={goal.progress === 100 ? [palette.success, palette.tint] : undefined}
    >
      <Row style={styles.featuredHeader}>
        <Row style={styles.headerLeft}>
          <CategoryBadge category={goal.category} />
          {goal.status !== 'ACTIVE' && (
            <View style={[styles.statusBadge, { backgroundColor: withAlpha(statusColor, 0.12) }]}>
              <ThemedText style={[styles.statusText, { color: statusColor }]}>
                {statusLabel}
              </ThemedText>
            </View>
          )}
        </Row>
        <ProgressRing progress={goal.progress} size={72} progressColor={categoryColor} />
      </Row>

      <ThemedText type="subtitle" style={styles.featuredTitle}>
        {goal.title}
      </ThemedText>

      {goal.description && (
        <ThemedText style={[styles.description, { color: palette.muted }]} numberOfLines={2}>
          {goal.description}
        </ThemedText>
      )}

      <Row style={styles.metaRow}>
        {goal.targetDate && (
          <Row style={styles.metaItem}>
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
          </Row>
        )}
        <Row style={styles.metaItem}>
          <Ionicons name="flag-outline" size={16} color={palette.icon} />
          <ThemedText style={styles.metaLabel}>
            {completedMilestones} of {goal.milestones.length} milestones
          </ThemedText>
        </Row>
      </Row>

      {showMilestones && goal.milestones.length > 0 && (
        <View style={[styles.milestonesPreview, { borderTopColor: palette.border }]}>
          <MilestoneList milestones={goal.milestones} editable={false} compact />
        </View>
      )}
    </SurfaceCard>
  );
});

export { styles };
