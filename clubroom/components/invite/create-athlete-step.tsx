/**
 * CreateAthleteStep — Athlete selection step for the create invite wizard.
 *
 * Shows the coach's roster as a selectable list with checkboxes.
 * Also renders a "Recent Sent Invites" banner when invites exist.
 */

import React, { memo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Column } from '@/components/primitives';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { SentInvitesBanner } from '@/components/invite/sent-invites-banner';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { AthleteOption } from '@/hooks/use-create-invite';
import type { SessionInvite } from '@/constants/types';

// ============================================================================
// PROPS
// ============================================================================

export interface CreateAthleteStepProps {
  athletes: AthleteOption[];
  selectedAthletes: AthleteOption[];
  sentInvites: SessionInvite[];
  onToggleAthlete: (athlete: AthleteOption) => void;
  colors: ThemeColors;
}

// ============================================================================
// ATHLETE ROW
// ============================================================================

interface AthleteRowProps {
  athlete: AthleteOption;
  isSelected: boolean;
  onToggle: (athlete: AthleteOption) => void;
  colors: ThemeColors;
}

const AthleteRow = memo(function AthleteRow({ athlete, isSelected, onToggle, colors }: AthleteRowProps) {
  const handlePress = useCallback(() => {
    onToggle(athlete);
  }, [athlete, onToggle]);

  return (
    <Clickable
      onPress={handlePress}
      style={[
        styles.athleteItem,
        {
          backgroundColor: isSelected ? withAlpha(colors.tint, 0.06) : colors.surface,
          borderColor: isSelected ? colors.tint : colors.border,
        },
      ]}
      accessibilityLabel={`${isSelected ? 'Deselect' : 'Select'} ${athlete.name}`}
      accessibilityRole="button"
    >
      <View style={[styles.avatar, { backgroundColor: withAlpha(colors.tint, 0.09) }]}>
        <ThemedText style={[styles.avatarText, { color: colors.tint }]}>
          {athlete.name.charAt(0)}
        </ThemedText>
      </View>
      <Column gap="micro" style={styles.athleteInfo}>
        <ThemedText type="defaultSemiBold">{athlete.name}</ThemedText>
        <ThemedText style={[styles.parentName, { color: colors.muted }]}>
          Parent: {athlete.parentName}
        </ThemedText>
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

export const CreateAthleteStep = memo(function CreateAthleteStep({
  athletes,
  selectedAthletes,
  sentInvites,
  onToggleAthlete,
  colors,
}: CreateAthleteStepProps) {
  return (
    <>
      <SentInvitesBanner invites={sentInvites} colors={colors} />

      <Animated.View entering={FadeInDown.springify()}>
        <Column gap="md">
          <ThemedText type="subtitle" style={styles.stepTitle}>
            Select Athletes
          </ThemedText>
          <ThemedText style={[styles.stepDescription, { color: colors.muted }]}>
            Choose which athletes you want to invite to this session
          </ThemedText>

          <Column gap="sm">
            {athletes.map((athlete) => (
              <AthleteRow
                key={athlete.id}
                athlete={athlete}
                isSelected={selectedAthletes.some((a) => a.id === athlete.id)}
                onToggle={onToggleAthlete}
                colors={colors}
              />
            ))}
          </Column>
        </Column>
      </Animated.View>
    </>
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
  athleteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    gap: Spacing.md,
    minHeight: 44,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...Typography.heading,
  },
  athleteInfo: {
    flex: 1,
  },
  parentName: {
    ...Typography.small,
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
