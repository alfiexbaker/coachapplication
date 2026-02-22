import React, { memo } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { calculateDaysRemaining } from '@/constants/challenge-definitions';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { AthleteProgress } from '@/services/progress-service';
import type { ProgressChallenge } from '@/types/progress-types';

interface ProgressGoalsTabProps {
  progress: AthleteProgress;
  challenge?: ProgressChallenge | null;
  showGoalForm: boolean;
  newGoalTitle: string;
  colors: ThemeColors;
  onToggleForm: () => void;
  onGoalTitleChange: (text: string) => void;
  onCreateGoal: () => void;
  onCancelForm: () => void;
}

function mapCreatorLabel(createdBy: string): string {
  switch (createdBy) {
    case 'COACH':
      return 'Set by coach';
    case 'PARENT':
      return 'Set by parent';
    case 'ATHLETE':
    default:
      return 'Set by you';
  }
}

export const ProgressGoalsTab = memo(function ProgressGoalsTab({
  progress,
  challenge,
  showGoalForm,
  newGoalTitle,
  colors,
  onToggleForm,
  onGoalTitleChange,
  onCreateGoal,
  onCancelForm,
}: ProgressGoalsTabProps) {
  const challengeProgress = challenge
    ? Math.max(0, Math.min(100, challenge.progress))
    : 0;
  const daysRemaining = challenge ? calculateDaysRemaining(challenge.expiresAt) : 0;

  return (
    <View style={styles.section}>
      <Row align="center" justify="space-between">
        <ThemedText type="heading" style={Typography.heading}>
          My Goals
        </ThemedText>
        <Clickable
          onPress={onToggleForm}
          style={[styles.addBtn, { backgroundColor: withAlpha(colors.tint, 0.09) }]}
        >
          <Row align="center" gap="xxs">
            <Ionicons name="add" size={18} color={colors.tint} />
            <ThemedText style={[Typography.smallSemiBold, { color: colors.tint }]}>
              Add Goal
            </ThemedText>
          </Row>
        </Clickable>
      </Row>

      <SurfaceCard
        style={[styles.challengeCard, { borderColor: withAlpha(colors.tint, 0.2) }]}
      >
        {challenge ? (
          <Column gap="xxs">
            <Row align="center" gap="xs">
              <Ionicons name="flag-outline" size={16} color={colors.tint} />
              <ThemedText style={styles.challengeTitle}>Next Challenge</ThemedText>
            </Row>
            <ThemedText style={[Typography.bodySmallSemiBold, { color: colors.foreground }]}>
              {challenge.title}
            </ThemedText>
            <ThemedText style={[Typography.small, { color: colors.muted }]}>
              {challenge.description}
            </ThemedText>
            <Row align="center" gap="sm">
              <View
                style={[styles.progressBar, { backgroundColor: withAlpha(colors.tint, 0.12) }]}
              >
                <View
                  style={[
                    styles.progressFill,
                    { width: `${challengeProgress}%`, backgroundColor: colors.tint },
                  ]}
                />
              </View>
              <ThemedText style={[Typography.caption, { color: colors.muted, minWidth: 40, textAlign: 'right' }]}>
                {challenge.currentValue}/{challenge.targetValue}
              </ThemedText>
            </Row>
            <ThemedText style={[Typography.caption, { color: colors.muted }]}>
              Reward: {challenge.rewardLabel} · {daysRemaining} day{daysRemaining === 1 ? '' : 's'} left
            </ThemedText>
          </Column>
        ) : (
          <Row align="center" gap="xs">
            <Ionicons name="flag-outline" size={16} color={colors.tint} />
            <ThemedText style={styles.challengeTitle}>
              {progress.totalSessions === 0
                ? 'Complete your first session to unlock challenges'
                : 'No active challenge yet'}
            </ThemedText>
          </Row>
        )}
      </SurfaceCard>

      {showGoalForm && (
        <SurfaceCard style={styles.form}>
          <TextInput
            value={newGoalTitle}
            onChangeText={onGoalTitleChange}
            placeholder="What do you want to achieve?"
            placeholderTextColor={colors.muted}
            style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
          />
          <Row gap="xs" justify="flex-end">
            <Clickable
              onPress={onCancelForm}
              style={[styles.formBtn, { borderColor: colors.border }]}
            >
              <ThemedText style={{ color: colors.muted }}>Cancel</ThemedText>
            </Clickable>
            <Clickable
              onPress={onCreateGoal}
              style={[styles.formBtn, { backgroundColor: colors.tint }]}
            >
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
                <ThemedText type="defaultSemiBold" style={[Typography.body, { flex: 1 }]}>
                  {goal.title}
                </ThemedText>
              </Row>
              <Row gap="sm" align="center">
                <View
                  style={[styles.progressBar, { backgroundColor: withAlpha(colors.tint, 0.12) }]}
                >
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${goal.progress}%`, backgroundColor: colors.tint },
                    ]}
                  />
                </View>
              <ThemedText
                style={[
                  Typography.caption,
                  { color: colors.muted, minWidth: 32, textAlign: 'right' },
                ]}
              >
                {goal.progress}%
              </ThemedText>
            </Row>
            <ThemedText style={[Typography.caption, { color: colors.muted }]}>
              {mapCreatorLabel(goal.createdBy)}
            </ThemedText>
            {goal.description && (
              <ThemedText style={[Typography.small, { color: colors.muted }]}>
                {goal.description}
              </ThemedText>
              )}
            </SurfaceCard>
          ))}
        </View>
      ) : (
        <SurfaceCard style={styles.empty}>
          <Ionicons name="flag-outline" size={32} color={colors.muted} />
          <ThemedText style={[Typography.bodySemiBold, { color: colors.muted }]}>
            No active goals
          </ThemedText>
          <ThemedText style={[Typography.small, { color: colors.muted, textAlign: 'center' }]}>
            Set goals to track your progress
          </ThemedText>
        </SurfaceCard>
      )}

      {progress.completedGoals.length > 0 && (
        <>
          <ThemedText
            type="defaultSemiBold"
            style={[Typography.bodySmall, { marginTop: Spacing.md }]}
          >
            Completed Goals
          </ThemedText>
          {progress.completedGoals.map((goal) => (
            <SurfaceCard key={goal.id} style={[styles.goalCard, { opacity: 0.7 }]}>
              <Row gap="xs" align="center">
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                <ThemedText
                  style={[Typography.body, { flex: 1, textDecorationLine: 'line-through' }]}
                >
                  {goal.title}
                </ThemedText>
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
  addBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
    justifyContent: 'center',
  },
  form: { padding: Spacing.md, gap: Spacing.sm },
  input: { borderWidth: 1, borderRadius: Radii.md, padding: Spacing.sm, ...Typography.body },
  formBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  challengeCard: {
    borderWidth: 1,
    padding: Spacing.sm,
  },
  challengeTitle: {
    ...Typography.bodySmall,
  },
  list: { gap: Spacing.sm },
  goalCard: { padding: Spacing.md, gap: Spacing.sm },
  progressBar: { flex: 1, height: 6, borderRadius: Radii.xs, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: Radii.xs },
  empty: { alignItems: 'center', padding: Spacing.xl, gap: Spacing.sm },
});
