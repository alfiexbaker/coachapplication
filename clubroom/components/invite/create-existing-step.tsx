/**
 * CreateExistingStep — Existing session selection step for the create invite wizard.
 *
 * Displays upcoming published sessions for the coach to invite athletes to.
 */

import React, { memo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Row, Column } from '@/components/primitives';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { GroupSession } from '@/constants/types';

export interface CreateExistingStepProps {
  existingSessions: GroupSession[];
  selectedSession: GroupSession | null;
  onSelectSession: (session: GroupSession) => void;
  colors: ThemeColors;
}

// ============================================================================
// SESSION ROW
// ============================================================================

interface ExistingSessionRowProps {
  session: GroupSession;
  isSelected: boolean;
  onSelect: (session: GroupSession) => void;
  colors: ThemeColors;
}

const ExistingSessionRow = memo(function ExistingSessionRow({
  session,
  isSelected,
  onSelect,
  colors,
}: ExistingSessionRowProps) {
  const handlePress = useCallback(() => {
    onSelect(session);
  }, [session, onSelect]);

  const nextSchedule = session.schedule[0];
  const spotsRemaining = session.maxParticipants - session.currentParticipants;

  return (
    <Clickable
      onPress={handlePress}
      style={[
        styles.sessionItem,
        {
          backgroundColor: isSelected ? withAlpha(colors.tint, 0.06) : colors.surface,
          borderColor: isSelected ? colors.tint : colors.border,
        },
      ]}
      accessibilityLabel={`Select session ${session.title}`}
      accessibilityRole="button"
    >
      <View style={[styles.sessionIcon, { backgroundColor: withAlpha(colors.tint, 0.09) }]}>
        <Ionicons name="football-outline" size={20} color={colors.tint} />
      </View>
      <Column gap="micro" style={styles.sessionInfo}>
        <ThemedText type="defaultSemiBold" numberOfLines={1}>{session.title}</ThemedText>
        {nextSchedule && (
          <ThemedText style={[styles.sessionMeta, { color: colors.muted }]}>
            {new Date(nextSchedule.date).toLocaleDateString('en-GB', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
            })}{' '}
            {nextSchedule.startTime}-{nextSchedule.endTime}
          </ThemedText>
        )}
        <Row gap="sm" align="center" style={styles.sessionFooter}>
          <ThemedText style={{ ...Typography.caption, color: colors.muted }}>
            {session.location}
          </ThemedText>
          <ThemedText
            style={{
              ...Typography.caption,
              color: spotsRemaining <= 2 ? colors.error : colors.success,
            }}
          >
            {spotsRemaining} spot{spotsRemaining !== 1 ? 's' : ''} left
          </ThemedText>
        </Row>
      </Column>
      <View
        style={[
          styles.checkbox,
          {
            backgroundColor: isSelected ? colors.tint : 'transparent',
            borderColor: isSelected ? colors.tint : colors.border,
          },
        ]}
      >
        {isSelected && <Ionicons name="checkmark" size={14} color={colors.onPrimary} />}
      </View>
    </Clickable>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const CreateExistingStep = memo(function CreateExistingStep({
  existingSessions,
  selectedSession,
  onSelectSession,
  colors,
}: CreateExistingStepProps) {
  return (
    <Animated.View entering={FadeInDown.springify()}>
      <Column gap="md">
        <ThemedText type="subtitle" style={styles.stepTitle}>
          Select a Session
        </ThemedText>
        <ThemedText style={[styles.stepDescription, { color: colors.muted }]}>
          Choose an upcoming published session to invite athletes to
        </ThemedText>

        <Column gap="sm">
          {existingSessions.map((session) => (
            <ExistingSessionRow
              key={session.id}
              session={session}
              isSelected={selectedSession?.id === session.id}
              onSelect={onSelectSession}
              colors={colors}
            />
          ))}
        </Column>
      </Column>
    </Animated.View>
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  stepTitle: {
    ...Typography.title,
  },
  stepDescription: {
    ...Typography.bodySmall,
    marginBottom: Spacing.sm,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    gap: Spacing.md,
    minHeight: 44,
  },
  sessionIcon: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionInfo: {
    flex: 1,
  },
  sessionMeta: {
    ...Typography.small,
  },
  sessionFooter: {
    marginTop: Spacing.xxs,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: Radii.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
