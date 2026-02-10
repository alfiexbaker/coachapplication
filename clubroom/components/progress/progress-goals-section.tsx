/**
 * GoalsSection — Active goals list for progress dashboard.
 */
import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { Goal } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

function GoalsSectionInner({ goals, onViewGoal }: { goals: Goal[]; onViewGoal?: (g: Goal) => void }) {
  const { colors: palette } = useTheme();

  if (goals.length === 0) {
    return (
      <SurfaceCard style={styles.emptyCard}>
        <Ionicons name="flag-outline" size={24} color={palette.muted} />
        <ThemedText style={[styles.emptyText, { color: palette.muted }]}>No active goals</ThemedText>
      </SurfaceCard>
    );
  }

  return (
    <View style={styles.container}>
      {goals.slice(0, 3).map((goal) => (
        <SurfaceCard key={goal.id} style={styles.goalCard} onPress={onViewGoal ? () => onViewGoal(goal) : undefined} tactile={Boolean(onViewGoal)}>
          <Row align="center" gap="xxs">
            <Ionicons name="flag" size={16} color={palette.tint} />
            <ThemedText type="defaultSemiBold" style={styles.goalTitle} numberOfLines={1}>{goal.title}</ThemedText>
          </Row>
          <Row align="center" gap="sm">
            <View style={[styles.goalProgressBar, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
              <View style={[styles.goalProgressFill, { width: `${goal.progress}%`, backgroundColor: palette.tint }]} />
            </View>
            <ThemedText style={[styles.goalProgressText, { color: palette.muted }]}>{goal.progress}%</ThemedText>
          </Row>
          {goal.targetDate && (
            <ThemedText style={[styles.goalDueDate, { color: palette.muted }]}>
              Target: {new Date(goal.targetDate).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
            </ThemedText>
          )}
        </SurfaceCard>
      ))}
    </View>
  );
}

export const GoalsSection = memo(GoalsSectionInner);

const styles = StyleSheet.create({
  container: { gap: Spacing.sm },
  emptyCard: { alignItems: 'center', padding: Spacing.lg, gap: Spacing.xs },
  emptyText: { ...Typography.bodySmall },
  goalCard: { padding: Spacing.sm, gap: Spacing.xxs },
  goalHeader: { /* layout moved to Row */ },
  goalTitle: { ...Typography.bodySmall, flex: 1 },
  goalProgress: { /* layout moved to Row */ },
  goalProgressBar: { flex: 1, height: 4, borderRadius: Radii.xs, overflow: 'hidden' },
  goalProgressFill: { height: '100%', borderRadius: Radii.xs },
  goalProgressText: { ...Typography.caption, minWidth: 32, textAlign: 'right' },
  goalDueDate: { ...Typography.caption },
});
