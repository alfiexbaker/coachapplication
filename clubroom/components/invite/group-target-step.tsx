/**
 * GroupTargetStep — First step of group invite wizard.
 *
 * Lets the coach choose how to select athletes:
 * - Individual athletes from roster
 * - Entire squad
 * - Custom filtered selection
 *
 * When "squad" is selected, shows an inline squad picker.
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
import type { Squad } from '@/components/coach/invite-athlete-modal';

export type TargetType = 'individual' | 'squad' | 'custom';

export interface GroupTargetStepProps {
  targetType: TargetType | null;
  onTargetSelect: (type: TargetType) => void;
  squads: Squad[];
  selectedSquadId: string | null;
  onSquadSelect: (squadId: string) => void;
  colors: ThemeColors;
}

// ─── Target Option Card (memo'd) ────────────────────────────────────────────

interface TargetOptionProps {
  type: TargetType;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  selected: boolean;
  onPress: (type: TargetType) => void;
  colors: ThemeColors;
}

const TargetOption = memo(function TargetOption({
  type,
  icon,
  title,
  description,
  selected,
  onPress,
  colors,
}: TargetOptionProps) {
  const handlePress = useCallback(() => onPress(type), [onPress, type]);

  return (
    <Clickable
      onPress={handlePress}
      style={[
        styles.targetCard,
        {
          backgroundColor: selected ? withAlpha(colors.tint, 0.06) : colors.surface,
          borderColor: selected ? colors.tint : colors.border,
        },
      ]}
      accessibilityLabel={`${title}${selected ? ', selected' : ''}`}
      accessibilityRole="button"
    >
      <View style={[styles.targetIcon, { backgroundColor: withAlpha(colors.tint, 0.09) }]}>
        <Ionicons name={icon} size={24} color={colors.tint} />
      </View>
      <Column style={styles.targetInfo} gap="micro">
        <ThemedText type="defaultSemiBold">{title}</ThemedText>
        <ThemedText style={[styles.targetDescription, { color: colors.muted }]}>
          {description}
        </ThemedText>
      </Column>
      <Ionicons name="chevron-forward" size={20} color={colors.muted} />
    </Clickable>
  );
});

// ─── Squad Selector Item (memo'd) ───────────────────────────────────────────

interface SquadItemProps {
  squad: Squad;
  selected: boolean;
  onPress: (squadId: string) => void;
  colors: ThemeColors;
}

const SquadItem = memo(function SquadItem({ squad, selected, onPress, colors }: SquadItemProps) {
  const handlePress = useCallback(() => onPress(squad.id), [onPress, squad.id]);

  return (
    <Clickable
      onPress={handlePress}
      style={[
        styles.squadItem,
        {
          backgroundColor: selected ? withAlpha(colors.tint, 0.06) : colors.surface,
          borderColor: selected ? colors.tint : colors.border,
        },
      ]}
      accessibilityLabel={`Squad ${squad.name}${selected ? ', selected' : ''}`}
      accessibilityRole="button"
    >
      <Ionicons name="people" size={18} color={colors.tint} />
      <ThemedText style={styles.squadName}>{squad.name}</ThemedText>
      {selected && <Ionicons name="checkmark-circle" size={20} color={colors.tint} />}
    </Clickable>
  );
});

// ─── Main Component ─────────────────────────────────────────────────────────

export const GroupTargetStep = memo(function GroupTargetStep({
  targetType,
  onTargetSelect,
  squads,
  selectedSquadId,
  onSquadSelect,
  colors,
}: GroupTargetStepProps) {
  return (
    <Animated.View entering={FadeInDown.springify()}>
      <Column gap="md">
        <ThemedText type="subtitle" style={styles.stepTitle}>
          Who do you want to invite?
        </ThemedText>
        <ThemedText style={[styles.stepDescription, { color: colors.muted }]}>
          Select how you want to choose athletes for this session
        </ThemedText>

        <Column gap="sm">
          <TargetOption
            type="individual"
            icon="person"
            title="Individual Athletes"
            description="Pick specific athletes from your roster"
            selected={targetType === 'individual'}
            onPress={onTargetSelect}
            colors={colors}
          />
          <TargetOption
            type="squad"
            icon="people"
            title="Entire Squad"
            description="Invite all athletes in a specific group"
            selected={targetType === 'squad'}
            onPress={onTargetSelect}
            colors={colors}
          />
          <TargetOption
            type="custom"
            icon="filter"
            title="Custom Selection"
            description="Filter by skill level, age, or other criteria"
            selected={targetType === 'custom'}
            onPress={onTargetSelect}
            colors={colors}
          />
        </Column>

        {targetType === 'squad' && (
          <Animated.View entering={FadeInDown.springify()}>
            <Column gap="sm" style={styles.squadSelector}>
              <ThemedText style={styles.formLabel}>Select a Squad</ThemedText>
              <Column gap="xs">
                {squads.map((squad) => (
                  <SquadItem
                    key={squad.id}
                    squad={squad}
                    selected={selectedSquadId === squad.id}
                    onPress={onSquadSelect}
                    colors={colors}
                  />
                ))}
              </Column>
            </Column>
          </Animated.View>
        )}
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
  targetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    gap: Spacing.md,
    minHeight: 44,
  },
  targetIcon: {
    width: 48,
    height: 48,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetInfo: {
    flex: 1,
  },
  targetDescription: {
    ...Typography.small,
  },
  squadSelector: {
    marginTop: Spacing.md,
  },
  squadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.sm,
    minHeight: 44,
  },
  squadName: {
    flex: 1,
  },
  formLabel: {
    ...Typography.bodySmallSemiBold,
    marginBottom: Spacing.xxs,
  },
});
