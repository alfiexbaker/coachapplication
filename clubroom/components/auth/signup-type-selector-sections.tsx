import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { useTheme } from '@/hooks/useTheme';

type ThemeColors = ReturnType<typeof useTheme>['colors'];

// ─── Data ───────────────────────────────────────────────────────

export type SignupType = 'player' | 'parent' | 'coach';

export interface AccountTypeOption {
  type: SignupType;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export const ACCOUNT_TYPE_OPTIONS: AccountTypeOption[] = [
  { type: 'player', title: 'Player', subtitle: 'I play football', icon: 'football-outline' },
  { type: 'parent', title: 'Parent/Guardian', subtitle: "I manage my children's training", icon: 'people-outline' },
  { type: 'coach', title: 'Coach', subtitle: 'I coach players', icon: 'fitness-outline' },
];

// ─── AccountTypeCard ────────────────────────────────────────────

export interface AccountTypeCardProps {
  option: AccountTypeOption;
  isSelected: boolean;
  onSelect: () => void;
  palette: ThemeColors;
}

export const AccountTypeCard = memo(function AccountTypeCard({
  option,
  isSelected,
  onSelect,
  palette,
}: AccountTypeCardProps) {
  return (
    <Clickable
      onPress={onSelect}
      accessibilityRole="button"
      accessibilityLabel={`${option.title}: ${option.subtitle}`}
      style={[
        styles.card,
        {
          backgroundColor: isSelected ? withAlpha(palette.tint, 0.03) : palette.surface,
          borderColor: isSelected ? palette.tint : palette.border,
          borderWidth: isSelected ? 2 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: isSelected ? withAlpha(palette.tint, 0.09) : withAlpha(palette.tint, 0.03),
          },
        ]}
      >
        <Ionicons name={option.icon} size={32} color={isSelected ? palette.tint : palette.muted} />
      </View>
      <View style={styles.cardText}>
        <ThemedText
          type="defaultSemiBold"
          style={[styles.cardTitle, isSelected ? { color: palette.tint } : undefined]}
        >
          {option.title}
        </ThemedText>
        <ThemedText style={[styles.cardSubtitle, { color: palette.muted }]}>
          {option.subtitle}
        </ThemedText>
      </View>
      <View style={[styles.radioOuter, { borderColor: isSelected ? palette.tint : palette.border }]}>
        {isSelected && <View style={[styles.radioInner, { backgroundColor: palette.tint }]} />}
      </View>
    </Clickable>
  );
});

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.lg,
    gap: Spacing.md,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    flex: 1,
    gap: Spacing.micro,
  },
  cardTitle: { ...Typography.heading },
  cardSubtitle: { ...Typography.body },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: Radii.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: Radii.sm,
  },
});
