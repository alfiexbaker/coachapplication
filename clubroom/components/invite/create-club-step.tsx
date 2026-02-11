/**
 * CreateClubStep — Club/Academy selection step for the create invite wizard.
 *
 * Allows the coach to send the invite on behalf of a club or as a personal invite.
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
import type { Academy } from '@/constants/types';

export interface CreateClubStepProps {
  myAcademies: Academy[];
  selectedClub: Academy | null;
  onSelectClub: (club: Academy | null) => void;
  colors: ThemeColors;
}

// ============================================================================
// CLUB ROW
// ============================================================================

interface ClubRowProps {
  academy: Academy;
  isSelected: boolean;
  onSelect: (club: Academy) => void;
  colors: ThemeColors;
}

const ClubRow = memo(function ClubRow({ academy, isSelected, onSelect, colors }: ClubRowProps) {
  const handlePress = useCallback(() => {
    onSelect(academy);
  }, [academy, onSelect]);

  return (
    <Clickable
      onPress={handlePress}
      style={[
        styles.clubItem,
        {
          backgroundColor: isSelected ? withAlpha(colors.tint, 0.06) : colors.surface,
          borderColor: isSelected ? colors.tint : colors.border,
        },
      ]}
      accessibilityLabel={`Select ${academy.name}`}
      accessibilityRole="button"
    >
      <View style={[styles.clubIcon, { backgroundColor: academy.primaryColor || colors.tint }]}>
        <ThemedText style={[styles.clubIconText, { color: colors.onPrimary }]}>
          {academy.name.charAt(0)}
        </ThemedText>
      </View>
      <Column gap="micro" style={styles.clubInfo}>
        <ThemedText type="defaultSemiBold">{academy.name}</ThemedText>
        <ThemedText style={[styles.clubSubtitle, { color: colors.muted }]}>
          {academy.city}
        </ThemedText>
      </Column>
      {isSelected && <Ionicons name="checkmark-circle" size={22} color={colors.tint} />}
    </Clickable>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const CreateClubStep = memo(function CreateClubStep({
  myAcademies,
  selectedClub,
  onSelectClub,
  colors,
}: CreateClubStepProps) {
  const handleSelectPersonal = useCallback(() => {
    onSelectClub(null);
  }, [onSelectClub]);

  return (
    <Animated.View entering={FadeInDown.springify()}>
      <Column gap="md">
        <ThemedText type="subtitle" style={styles.stepTitle}>
          Select Club/Academy
        </ThemedText>
        <ThemedText style={[styles.stepDescription, { color: colors.muted }]}>
          Send this invite on behalf of your club or academy (optional)
        </ThemedText>

        {/* Personal invite option */}
        <Clickable
          onPress={handleSelectPersonal}
          style={[
            styles.clubItem,
            {
              backgroundColor:
                selectedClub === null ? withAlpha(colors.tint, 0.06) : colors.surface,
              borderColor: selectedClub === null ? colors.tint : colors.border,
            },
          ]}
          accessibilityLabel="Send as personal invite"
          accessibilityRole="button"
        >
          <View style={[styles.clubIcon, { backgroundColor: colors.border }]}>
            <Ionicons name="person" size={20} color={colors.muted} />
          </View>
          <Column gap="micro" style={styles.clubInfo}>
            <ThemedText type="defaultSemiBold">Personal Invite</ThemedText>
            <ThemedText style={[styles.clubSubtitle, { color: colors.muted }]}>
              Send as yourself, not as a club
            </ThemedText>
          </Column>
          {selectedClub === null && (
            <Ionicons name="checkmark-circle" size={22} color={colors.tint} />
          )}
        </Clickable>

        {/* Club options */}
        {myAcademies.map((academy) => (
          <ClubRow
            key={academy.id}
            academy={academy}
            isSelected={selectedClub?.id === academy.id}
            onSelect={onSelectClub}
            colors={colors}
          />
        ))}
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
  clubItem: {
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    gap: Spacing.md,
    minHeight: 44,
  },
  clubIcon: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubIconText: {
    ...Typography.heading,
  },
  clubInfo: {
    flex: 1,
  },
  clubSubtitle: {
    ...Typography.small,
  },
});
