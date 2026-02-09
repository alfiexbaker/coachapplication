/**
 * DevGoalsTab — Goals summary and active goals list.
 */
import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography, withAlpha } from '@/constants/theme';
import { Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { EmptyMetrics } from '@/components/analytics/enhanced-stats';
import { GoalProgress, GoalsSummary } from '@/components/analytics/goal-progress';
import type { Goal } from '@/constants/types';

interface DevGoalsTabProps {
  activeGoals: Goal[];
  completedGoals: Goal[];
}

function DevGoalsTabInner({ activeGoals, completedGoals }: DevGoalsTabProps) {
  const { colors: palette } = useTheme();

  return (
    <Animated.View entering={FadeIn} style={styles.container}>
      <GoalsSummary activeGoals={activeGoals.length} completedGoals={completedGoals.length} />

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Active Goals</ThemedText>
          <View style={[styles.countBadge, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
            <ThemedText style={[styles.countText, { color: palette.tint }]}>{activeGoals.length}</ThemedText>
          </View>
        </View>

        {activeGoals.length === 0 ? (
          <EmptyMetrics icon="flag-outline" title="No Active Goals" description="Goals will appear here when set by coaches" />
        ) : (
          <View style={styles.list}>
            {activeGoals.map((goal, index) => (
              <Animated.View key={goal.id} entering={FadeInDown.delay(index * 50).springify()}>
                <GoalProgress goal={goal} expanded={index === 0} />
              </Animated.View>
            ))}
          </View>
        )}
      </View>
    </Animated.View>
  );
}

export const DevGoalsTab = memo(DevGoalsTabInner);

const styles = StyleSheet.create({
  container: { gap: Spacing.md },
  section: { gap: Spacing.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { ...Typography.subheading },
  countBadge: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.micro, borderRadius: Radii.pill },
  countText: { ...Typography.caption },
  list: { gap: Spacing.sm },
});
