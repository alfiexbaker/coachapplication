/**
 * GoalsSection — Active goals list for progress dashboard.
 */
import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
          <View style={styles.goalHeader}>
            <Ionicons name="flag" size={16} color={palette.tint} />
            <ThemedText type="defaultSemiBold" style={styles.goalTitle} numberOfLines={1}>{goal.title}</ThemedText>
          </View>
          <View style={styles.goalProgress}>
            <View style={[styles.goalProgressBar, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
              <View style={[styles.goalProgressFill, { width: `${goal.progress}%`, backgroundColor: palette.tint }]} />
            </View>
            <ThemedText style={[styles.goalProgressText, { color: palette.muted }]}>{goal.progress}%</ThemedText>
          </View>
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
  goalHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs },
  goalTitle: { ...Typography.bodySmall, flex: 1 },
  goalProgress: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  goalProgressBar: { flex: 1, height: 4, borderRadius: Radii.xs, overflow: 'hidden' },
  goalProgressFill: { height: '100%', borderRadius: Radii.xs },
  goalProgressText: { ...Typography.caption, minWidth: 32, textAlign: 'right' },
  goalDueDate: { ...Typography.caption },
});
