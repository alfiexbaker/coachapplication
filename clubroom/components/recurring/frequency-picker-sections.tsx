/**
 * Extracted sub-components for FrequencyPicker.
 *
 * FrequencyCardOption — single card-style frequency option row.
 * FrequencyPillOption — single pill-style frequency option.
 * FREQUENCY_OPTIONS — available frequency configuration.
 */

import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import type { RecurrenceFrequency } from '@/constants/types';
import type { ThemeColors } from '@/hooks/useTheme';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FrequencyOption {
  value: RecurrenceFrequency;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  sessionsPerMonth: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const FREQUENCY_OPTIONS: FrequencyOption[] = [
  {
    value: 'WEEKLY',
    label: 'Weekly',
    description: 'Every week on the same day',
    icon: 'calendar',
    sessionsPerMonth: 4,
  },
  {
    value: 'BIWEEKLY',
    label: 'Biweekly',
    description: 'Every 2 weeks on the same day',
    icon: 'calendar-outline',
    sessionsPerMonth: 2,
  },
  {
    value: 'MONTHLY',
    label: 'Monthly',
    description: 'Once a month on the same day',
    icon: 'calendar-clear',
    sessionsPerMonth: 1,
  },
];

// ─── FrequencyCardOption ──────────────────────────────────────────────────────

interface FrequencyCardOptionProps {
  option: FrequencyOption;
  isSelected: boolean;
  monthlyEstimate: number | null;
  onPress: () => void;
  disabled: boolean;
  palette: ThemeColors;
}

export const FrequencyCardOption = memo(function FrequencyCardOption({
  option,
  isSelected,
  monthlyEstimate,
  onPress,
  disabled,
  palette,
}: FrequencyCardOptionProps) {
  return (
    <Clickable
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: isSelected ? withAlpha(palette.tint, 0.08) : palette.surface,
          borderColor: isSelected ? palette.tint : palette.border,
          borderWidth: isSelected ? 2 : 1,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
      disabled={disabled}
    >
      <View
        style={[styles.radioOuter, { borderColor: isSelected ? palette.tint : palette.border }]}
      >
        {isSelected && <View style={[styles.radioInner, { backgroundColor: palette.tint }]} />}
      </View>

      <View style={styles.cardContent}>
        <Row align="center" gap="xs">
          <Ionicons name={option.icon} size={20} color={isSelected ? palette.tint : palette.icon} />
          <ThemedText
            type="defaultSemiBold"
            style={{ color: isSelected ? palette.tint : palette.foreground }}
          >
            {option.label}
          </ThemedText>
        </Row>
        <ThemedText style={[styles.cardDescription, { color: palette.muted }]}>
          {option.description}
        </ThemedText>

        {monthlyEstimate !== null && (
          <Row align="center" gap="xxs" style={styles.estimateRow}>
            <ThemedText style={[styles.estimateLabel, { color: palette.muted }]}>
              Est. monthly:
            </ThemedText>
            <ThemedText
              style={[
                styles.estimateValue,
                { color: isSelected ? palette.tint : palette.foreground },
              ]}
            >
              ${monthlyEstimate}
            </ThemedText>
          </Row>
        )}
      </View>

      <View
        style={[
          styles.sessionsBadge,
          {
            backgroundColor: isSelected ? withAlpha(palette.tint, 0.15) : palette.background,
          },
        ]}
      >
        <ThemedText
          style={[styles.sessionsText, { color: isSelected ? palette.tint : palette.muted }]}
        >
          {option.sessionsPerMonth}x/mo
        </ThemedText>
      </View>
    </Clickable>
  );
});

// ─── FrequencyPillOption ──────────────────────────────────────────────────────

interface FrequencyPillOptionProps {
  option: FrequencyOption;
  isSelected: boolean;
  onPress: () => void;
  disabled: boolean;
  palette: ThemeColors;
}

export const FrequencyPillOption = memo(function FrequencyPillOption({
  option,
  isSelected,
  onPress,
  disabled,
  palette,
}: FrequencyPillOptionProps) {
  return (
    <Clickable
      onPress={onPress}
      style={[
        styles.pill,
        {
          backgroundColor: isSelected ? palette.tint : palette.surface,
          borderColor: isSelected ? palette.tint : palette.border,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
      disabled={disabled}
    >
      <ThemedText
        style={[styles.pillText, { color: isSelected ? palette.onPrimary : palette.foreground }]}
      >
        {option.label}
      </ThemedText>
    </Clickable>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  pill: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: { ...Typography.smallSemiBold },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.lg,
    gap: Spacing.sm,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: Radii.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: Radii.sm,
  },
  cardContent: { flex: 1, gap: Spacing.micro },
  cardDescription: { ...Typography.small },
  estimateRow: {
    marginTop: Spacing.xxs,
  },
  estimateLabel: { ...Typography.caption },
  estimateValue: { ...Typography.caption, fontWeight: '600' },
  sessionsBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
  sessionsText: { ...Typography.caption, fontWeight: '600' },
});
