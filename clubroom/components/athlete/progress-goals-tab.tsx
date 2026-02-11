/**
 * ProgressGoalsTab — Goals summary with active and completed goals lists.
 */
import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { EmptyMetrics } from '@/components/analytics/enhanced-stats';
import { GoalProgress, GoalsSummary } from '@/components/analytics/goal-progress';
import type { Goal } from '@/constants/types';
import { Row } from '@/components/primitives';

interface ProgressGoalsTabProps {
  activeGoals: Goal[];
  completedGoals: Goal[];
}

function ProgressGoalsTabInner({ activeGoals, completedGoals }: ProgressGoalsTabProps) {
  const { colors: palette } = useTheme();

  return (
    <Animated.View entering={FadeIn} style={styles.container}>
      <GoalsSummary activeGoals={activeGoals.length} completedGoals={completedGoals.length} />

      {/* Active Goals */}
      <View style={styles.section}>
        <Row style={styles.sectionHeader}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Active Goals
          </ThemedText>
          <Row style={[styles.badge, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
            <ThemedText style={[styles.badgeText, { color: palette.tint }]}>
              {activeGoals.length}
            </ThemedText>
          </Row>
        </Row>

        {activeGoals.length === 0 ? (
          <EmptyMetrics
            icon="flag-outline"
            title="No Active Goals"
            description="Set goals with your coach to track your progress towards specific achievements"
          />
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

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <View style={styles.section}>
          <Row style={styles.sectionHeader}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Completed Goals
            </ThemedText>
            <Row style={[styles.badge, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
              <Ionicons name="checkmark" size={12} color={palette.success} />
              <ThemedText style={[styles.badgeText, { color: palette.success }]}>
                {completedGoals.length}
              </ThemedText>
            </Row>
          </Row>

          <View style={styles.list}>
            {completedGoals.slice(0, 3).map((goal, index) => (
              <Animated.View key={goal.id} entering={FadeInDown.delay(index * 50).springify()}>
                <GoalProgress goal={goal} />
              </Animated.View>
            ))}
          </View>
        </View>
      )}
    </Animated.View>
  );
}

export const ProgressGoalsTab = memo(ProgressGoalsTabInner);

const styles = StyleSheet.create({
  container: { gap: Spacing.md },
  section: { gap: Spacing.sm },
  sectionHeader: { alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { ...Typography.subheading },
  badge: {
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.pill,
  },
  badgeText: { ...Typography.caption },
  list: { gap: Spacing.sm },
});
