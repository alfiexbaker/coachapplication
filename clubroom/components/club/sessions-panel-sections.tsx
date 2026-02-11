import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { groupSessionService } from '@/services/group-session-service';
import type { GroupSession } from '@/constants/types';
import type { useTheme } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';
import { getGroupSessionSquadLabel } from '@/utils/group-display';

type ThemeColors = ReturnType<typeof useTheme>['colors'];

// ─── TrainingSessionRow ─────────────────────────────────────────

export interface TrainingSessionRowProps {
  session: GroupSession;
  palette: ThemeColors;
}

export const TrainingSessionRow = memo(function TrainingSessionRow({
  session,
  palette,
}: TrainingSessionRowProps) {
  const nextDate = groupSessionService.getNextTrainingDate(session);
  const squadLabel = getGroupSessionSquadLabel(session);
  const dayName = session.recurringPattern
    ? groupSessionService.formatDayOfWeek(session.recurringPattern.dayOfWeek)
    : '';

  return (
    <Clickable
      style={[styles.trainingItem, { borderColor: palette.border }]}
      onPress={() => router.push(Routes.groupSession(session.id))}
    >
      <View style={styles.trainingItemLeft}>
        <ThemedText type="defaultSemiBold" style={{ ...Typography.bodySmall }}>
          {session.title}
        </ThemedText>
        <Row style={styles.trainingMeta}>
          {session.isRecurring && (
            <Row style={[styles.recurringBadge, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
              <Ionicons name="repeat" size={10} color={palette.tint} />
              <ThemedText style={{ ...Typography.micro, color: palette.tint }}>
                {dayName}s
              </ThemedText>
            </Row>
          )}
          <ThemedText style={{ ...Typography.caption, color: palette.muted }}>
            {nextDate ? `${nextDate.startTime} - ${nextDate.endTime}` : ''}
          </ThemedText>
        </Row>
        <Row style={styles.trainingLocation}>
          <Ionicons name="location-outline" size={12} color={palette.muted} />
          <ThemedText style={{ ...Typography.caption, color: palette.muted }} numberOfLines={1}>
            {session.location}
          </ThemedText>
        </Row>
      </View>
      <View style={styles.trainingItemRight}>
        {squadLabel && (
          <View style={[styles.squadTag, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
            <ThemedText style={{ color: palette.tint, ...Typography.micro }}>
              {squadLabel}
            </ThemedText>
          </View>
        )}
        {session.pricePerParticipant === 0 ? (
          <ThemedText style={{ ...Typography.caption, color: palette.success }}>Free</ThemedText>
        ) : (
          <ThemedText style={{ color: palette.text, ...Typography.caption }}>
            {groupSessionService.formatPrice(session.pricePerParticipant, session.currency)}
          </ThemedText>
        )}
      </View>
    </Clickable>
  );
});

// ─── EmptyTrainingState ─────────────────────────────────────────

export interface EmptyTrainingStateProps {
  isCoach: boolean;
  onCreateSession: () => void;
  palette: ThemeColors;
}

export const EmptyTrainingState = memo(function EmptyTrainingState({
  isCoach,
  onCreateSession,
  palette,
}: EmptyTrainingStateProps) {
  return (
    <View style={styles.emptyTraining}>
      <Ionicons name="calendar-outline" size={32} color={palette.muted} />
      <ThemedText style={{ ...Typography.small, color: palette.muted, textAlign: 'center' }}>
        No training sessions scheduled
      </ThemedText>
      {isCoach && (
        <Clickable
          style={[styles.createTrainingButton, { borderColor: palette.tint }]}
          onPress={onCreateSession}
        >
          <ThemedText style={{ color: palette.tint, ...Typography.smallSemiBold }}>
            Schedule Training
          </ThemedText>
        </Clickable>
      )}
    </View>
  );
});

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  trainingItem: {
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  trainingItemLeft: {
    flex: 1,
    gap: Spacing.xxs,
  },
  trainingMeta: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  recurringBadge: {
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  trainingLocation: {
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  trainingItemRight: {
    alignItems: 'flex-end',
    gap: Spacing.xxs,
  },
  squadTag: {
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  emptyTraining: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  createTrainingButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginTop: Spacing.xs,
  },
});
