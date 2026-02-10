import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { Goal } from '@/constants/types';
import { Row } from '@/components/primitives';

interface AthleteGoalCardProps {
  goal: Goal;
  index: number;
  onComplete: (milestoneId: string) => void;
}

export const AthleteGoalCard = memo(function AthleteGoalCard({ goal, index, onComplete }: AthleteGoalCardProps) {
  const { colors } = useTheme();

  const completedMilestones = goal.milestones.filter((m) => m.isCompleted).length;
  const totalMilestones = goal.milestones.length;

  return (
    <Animated.View entering={FadeInDown.delay(index * 75).springify()}>
      <SurfaceCard style={styles.card}>
        <Row style={styles.header}>
          <View style={styles.titleSection}>
            <ThemedText type="defaultSemiBold" style={styles.title}>{goal.title}</ThemedText>
            {goal.targetDate && (
              <ThemedText style={[styles.date, { color: colors.muted }]}>
                Target: {new Date(goal.targetDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </ThemedText>
            )}
          </View>
          <View style={[styles.progressCircle, { borderColor: colors.border }]}>
            <ThemedText style={[styles.progressText, { color: colors.tint }]}>{goal.progress}%</ThemedText>
          </View>
        </Row>

        {goal.description && (
          <ThemedText style={[styles.description, { color: colors.muted }]}>{goal.description}</ThemedText>
        )}

        <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
          <View style={[styles.progressBarFill, {
            width: `${goal.progress}%`,
            backgroundColor: goal.progress === 100 ? colors.success : colors.tint,
          }]} />
        </View>

        <View style={styles.milestones}>
          {goal.milestones.map((milestone) => (
            <Clickable key={milestone.id} onPress={() => !milestone.isCompleted && onComplete(milestone.id)} disabled={milestone.isCompleted} style={styles.milestone}>
              <View style={[styles.milestoneCheck, {
                backgroundColor: milestone.isCompleted ? colors.success : colors.surface,
                borderColor: milestone.isCompleted ? colors.success : colors.border,
              }]}>
                {milestone.isCompleted && <Ionicons name="checkmark" size={12} color={colors.onPrimary} />}
              </View>
              <ThemedText style={[styles.milestoneText, milestone.isCompleted && { textDecorationLine: 'line-through' as const, color: colors.muted }]}>
                {milestone.title}
              </ThemedText>
            </Clickable>
          ))}
        </View>

        <Row style={styles.footer}>
          <ThemedText style={[styles.milestoneCount, { color: colors.muted }]}>
            {completedMilestones}/{totalMilestones} milestones
          </ThemedText>
          <View style={[styles.creatorBadge, {
            backgroundColor: goal.createdBy === 'COACH' ? withAlpha(colors.tint, 0.09) : withAlpha(colors.success, 0.09),
          }]}>
            <ThemedText style={[styles.creatorText, {
              color: goal.createdBy === 'COACH' ? colors.tint : colors.success,
            }]}>
              {goal.createdBy === 'COACH' ? 'Coach goal' : 'Self-set'}
            </ThemedText>
          </View>
        </Row>
      </SurfaceCard>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: { padding: Spacing.md },
  header: { alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: Spacing.xs },
  titleSection: { flex: 1, marginRight: Spacing.sm },
  title: { ...Typography.body },
  date: { ...Typography.caption, marginTop: Spacing.micro },
  progressCircle: { width: 44, height: 44, borderRadius: Radii.xl, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  progressText: { ...Typography.caption },
  description: { ...Typography.small, marginBottom: Spacing.sm },
  progressBarBg: { height: 6, borderRadius: Radii.xs, overflow: 'hidden', marginBottom: Spacing.sm },
  progressBarFill: { height: '100%', borderRadius: Radii.xs },
  milestones: { gap: Spacing.xs },
  milestone: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xxs },
  milestoneCheck: { width: 20, height: 20, borderRadius: Radii.md, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  milestoneText: { ...Typography.small, flex: 1 },
  footer: { alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.sm, paddingTop: Spacing.sm },
  milestoneCount: { ...Typography.caption },
  creatorBadge: { paddingHorizontal: 8, paddingVertical: Spacing.micro, borderRadius: Radii.sm },
  creatorText: { ...Typography.micro },
});
