import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { GoalSummary } from './athlete-progress-helpers';

export function GoalCard({ goal }: { goal: GoalSummary }) {
  const { colors } = useTheme();
  const pct = Math.round(goal.progress * 100);

  return (
    <View style={[styles.goalCard, { backgroundColor: colors.surfaceSecondary }]}>
      <Row gap="sm" align="center" justify="between">
        <ThemedText type="defaultSemiBold" style={styles.flex1} numberOfLines={1}>
          {goal.title}
        </ThemedText>
        <ThemedText style={[styles.goalPct, { color: colors.tint }]}>{pct}%</ThemedText>
      </Row>
      <View style={[styles.goalTrack, { backgroundColor: withAlpha(colors.tint, 0.12) }]}>
        <View style={[styles.goalFill, { width: `${pct}%`, backgroundColor: colors.tint }]} />
      </View>
      {goal.dueDate && (
        <ThemedText style={[styles.goalDue, { color: colors.muted }]}>
          Due{' '}
          {new Date(goal.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  goalCard: { padding: Spacing.md, borderRadius: Radii.md, gap: Spacing.xs },
  goalPct: { ...Typography.bodySemiBold },
  goalTrack: { height: 6, borderRadius: Radii.xs, overflow: 'hidden' },
  goalFill: { height: '100%', borderRadius: Radii.xs },
  goalDue: { ...Typography.caption },
});
