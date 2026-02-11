/**
 * CreateModeStep — Mode selection step for the create invite wizard.
 *
 * Lets the coach choose between creating a new session or inviting to an existing one.
 */

import React, { memo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Column } from '@/components/primitives';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';

export interface CreateModeStepProps {
  inviteMode: 'new' | 'existing';
  existingSessionCount: number;
  onSelectMode: (mode: 'new' | 'existing') => void;
  colors: ThemeColors;
}

export const CreateModeStep = memo(function CreateModeStep({
  inviteMode,
  existingSessionCount,
  onSelectMode,
  colors,
}: CreateModeStepProps) {
  const handleSelectNew = useCallback(() => {
    onSelectMode('new');
  }, [onSelectMode]);

  const handleSelectExisting = useCallback(() => {
    onSelectMode('existing');
  }, [onSelectMode]);

  const hasExisting = existingSessionCount > 0;

  return (
    <Animated.View entering={FadeInDown.springify()}>
      <Column gap="md">
        <ThemedText type="subtitle" style={styles.stepTitle}>
          How would you like to invite?
        </ThemedText>
        <ThemedText style={[styles.stepDescription, { color: colors.muted }]}>
          Create a brand new session or invite to one you&apos;ve already published
        </ThemedText>

        <Clickable
          onPress={handleSelectNew}
          style={[
            styles.modeItem,
            {
              backgroundColor: inviteMode === 'new' ? withAlpha(colors.tint, 0.06) : colors.surface,
              borderColor: inviteMode === 'new' ? colors.tint : colors.border,
            },
          ]}
          accessibilityLabel="Create new session"
          accessibilityRole="button"
        >
          <View style={[styles.modeIcon, { backgroundColor: withAlpha(colors.tint, 0.09) }]}>
            <Ionicons name="add-circle-outline" size={22} color={colors.tint} />
          </View>
          <Column gap="micro" style={styles.modeInfo}>
            <ThemedText type="defaultSemiBold">Create New Session</ThemedText>
            <ThemedText style={[styles.modeSubtitle, { color: colors.muted }]}>
              Set up session type, time slots, and details from scratch
            </ThemedText>
          </Column>
          {inviteMode === 'new' && (
            <Ionicons name="checkmark-circle" size={22} color={colors.tint} />
          )}
        </Clickable>

        <Clickable
          onPress={handleSelectExisting}
          disabled={!hasExisting}
          style={[
            styles.modeItem,
            {
              backgroundColor:
                inviteMode === 'existing' ? withAlpha(colors.tint, 0.06) : colors.surface,
              borderColor: inviteMode === 'existing' ? colors.tint : colors.border,
              opacity: hasExisting ? 1 : 0.5,
            },
          ]}
          accessibilityLabel="Invite to existing session"
          accessibilityRole="button"
        >
          <View style={[styles.modeIcon, { backgroundColor: withAlpha(colors.success, 0.09) }]}>
            <Ionicons name="calendar-outline" size={22} color={colors.success} />
          </View>
          <Column gap="micro" style={styles.modeInfo}>
            <ThemedText type="defaultSemiBold">Invite to Existing Session</ThemedText>
            <ThemedText style={[styles.modeSubtitle, { color: colors.muted }]}>
              {hasExisting
                ? `${existingSessionCount} upcoming session${existingSessionCount !== 1 ? 's' : ''} available`
                : 'No upcoming published sessions'}
            </ThemedText>
          </Column>
          {inviteMode === 'existing' && (
            <Ionicons name="checkmark-circle" size={22} color={colors.tint} />
          )}
        </Clickable>
      </Column>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  stepTitle: {
    ...Typography.title,
  },
  stepDescription: {
    ...Typography.bodySmall,
    marginBottom: Spacing.sm,
  },
  modeItem: {
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    gap: Spacing.md,
    minHeight: 44,
  },
  modeIcon: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeInfo: {
    flex: 1,
  },
  modeSubtitle: {
    ...Typography.small,
  },
});
