import React, { memo } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { AthleteProgress } from '@/services/progress-service';

interface ProgressGoalsTabProps {
  progress: AthleteProgress;
  showGoalForm: boolean;
  newGoalTitle: string;
  colors: ThemeColors;
  onToggleForm: () => void;
  onGoalTitleChange: (text: string) => void;
  onCreateGoal: () => void;
  onCancelForm: () => void;
}

export const ProgressGoalsTab = memo(function ProgressGoalsTab({
  progress, showGoalForm, newGoalTitle, colors,
  onToggleForm, onGoalTitleChange, onCreateGoal, onCancelForm,
}: ProgressGoalsTabProps) {
  return (
    <View style={styles.section}>
      <Row align="center" justify="space-between">
        <ThemedText type="heading" style={Typography.heading}>My Goals</ThemedText>
        <Clickable onPress={onToggleForm} style={[styles.addBtn, { backgroundColor: withAlpha(colors.tint, 0.09) }]}>
          <Ionicons name="add" size={18} color={colors.tint} />
          <ThemedText style={[Typography.smallSemiBold, { color: colors.tint }]}>Add Goal</ThemedText>
        </Clickable>
      </Row>

      {showGoalForm && (
        <SurfaceCard style={styles.form}>
          <TextInput
            value={newGoalTitle} onChangeText={onGoalTitleChange}
            placeholder="What do you want to achieve?" placeholderTextColor={colors.muted}
            style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
          />
          <Row gap="xs" justify="flex-end">
            <Clickable onPress={onCancelForm} style={[styles.formBtn, { borderColor: colors.border }]}>
              <ThemedText style={{ color: colors.muted }}>Cancel</ThemedText>
            </Clickable>
            <Clickable onPress={onCreateGoal} style={[styles.formBtn, { backgroundColor: colors.tint }]}>
              <ThemedText style={{ color: colors.onPrimary, fontWeight: '600' }}>Create</ThemedText>
            </Clickable>
          </Row>
        </SurfaceCard>
      )}

      {progress.activeGoals.length > 0 ? (
        <View style={styles.list}>
          {progress.activeGoals.map((goal) => (
            <SurfaceCard key={goal.id} style={styles.goalCard}>
              <Row gap="xs" align="center">
                <Ionicons name="flag" size={18} color={colors.tint} />
                <ThemedText type="defaultSemiBold" style={[Typography.body, { flex: 1 }]}>{goal.title}</ThemedText>
              </Row>
              <Row gap="sm" align="center">
                <View style={[styles.progressBar, { backgroundColor: withAlpha(colors.tint, 0.12) }]}>
                  <View style={[styles.progressFill, { width: `${goal.progress}%`, backgroundColor: colors.tint }]} />
                </View>
                <ThemedText style={[Typography.caption, { color: colors.muted, minWidth: 32, textAlign: 'right' }]}>{goal.progress}%</ThemedText>
              </Row>
              {goal.description && <ThemedText style={[Typography.small, { color: colors.muted }]}>{goal.description}</ThemedText>}
            </SurfaceCard>
          ))}
        </View>
      ) : (
        <SurfaceCard style={styles.empty}>
          <Ionicons name="flag-outline" size={32} color={colors.muted} />
          <ThemedText style={[Typography.bodySemiBold, { color: colors.muted }]}>No active goals</ThemedText>
          <ThemedText style={[Typography.small, { color: colors.muted, textAlign: 'center' }]}>Set goals to track your progress</ThemedText>
        </SurfaceCard>
      )}

      {progress.completedGoals.length > 0 && (
        <>
          <ThemedText type="defaultSemiBold" style={[Typography.bodySmall, { marginTop: Spacing.md }]}>Completed Goals</ThemedText>
          {progress.completedGoals.map((goal) => (
            <SurfaceCard key={goal.id} style={[styles.goalCard, { opacity: 0.7 }]}>
              <Row gap="xs" align="center">
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                <ThemedText style={[Typography.body, { flex: 1, textDecorationLine: 'line-through' }]}>{goal.title}</ThemedText>
              </Row>
            </SurfaceCard>
          ))}
        </>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  section: { gap: Spacing.md },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xxs, borderRadius: Radii.sm },
  form: { padding: Spacing.md, gap: Spacing.sm },
  input: { borderWidth: 1, borderRadius: Radii.md, padding: Spacing.sm, ...Typography.body },
  formBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radii.sm, borderWidth: 1, borderColor: 'transparent' },
  list: { gap: Spacing.sm },
  goalCard: { padding: Spacing.md, gap: Spacing.sm },
  progressBar: { flex: 1, height: 6, borderRadius: Radii.xs, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: Radii.xs },
  empty: { alignItems: 'center', padding: Spacing.xl, gap: Spacing.sm },
});
