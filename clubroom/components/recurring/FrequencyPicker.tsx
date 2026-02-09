import React from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography } from '@/constants/theme';
import { RecurrenceFrequency } from '@/constants/types';
import { getFrequencyLabel } from '@/services/recurring-booking-service';
import { useTheme } from '@/hooks/useTheme';

/**
 * Frequency option configuration
 */
interface FrequencyOption {
  value: RecurrenceFrequency;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  sessionsPerMonth: number;
}

/**
 * Available frequency options
 */
const FREQUENCY_OPTIONS: FrequencyOption[] = [
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

/**
 * Props for the FrequencyPicker component
 */
interface FrequencyPickerProps {
  /** Currently selected frequency */
  value: RecurrenceFrequency;
  /** Called when the frequency changes */
  onChange: (frequency: RecurrenceFrequency) => void;
  /** Price per session (optional, for displaying monthly estimates) */
  pricePerSession?: number;
  /** Whether the picker is disabled */
  disabled?: boolean;
  /** Display style variant */
  variant?: 'cards' | 'pills';
}

/**
 * Convert hex color to rgba with alpha
 */
function withAlpha(hexColor: string, alpha: number): string {
  const hex = hexColor.replace('#', '');
  const bigint = parseInt(hex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * FrequencyPicker allows users to select how often a recurring booking
 * should repeat (weekly, biweekly, or monthly).
 */
export function FrequencyPicker({
  value,
  onChange,
  pricePerSession,
  disabled = false,
  variant = 'cards',
}: FrequencyPickerProps) {
  const { colors: palette } = useTheme();

  if (variant === 'pills') {
    return (
      <View style={styles.pillsContainer}>
        {FREQUENCY_OPTIONS.map((option) => {
          const isSelected = value === option.value;

          return (
            <Pressable
              key={option.value}
              onPress={() => !disabled && onChange(option.value)}
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
                style={[
                  styles.pillText,
                  { color: isSelected ? palette.onPrimary : palette.foreground },
                ]}
              >
                {option.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <View style={styles.cardsContainer}>
      {FREQUENCY_OPTIONS.map((option) => {
        const isSelected = value === option.value;
        const monthlyEstimate = pricePerSession
          ? pricePerSession * option.sessionsPerMonth
          : null;

        return (
          <Pressable
            key={option.value}
            onPress={() => !disabled && onChange(option.value)}
            style={[
              styles.card,
              {
                backgroundColor: isSelected
                  ? withAlpha(palette.tint, 0.08)
                  : palette.surface,
                borderColor: isSelected ? palette.tint : palette.border,
                borderWidth: isSelected ? 2 : 1,
                opacity: disabled ? 0.5 : 1,
              },
            ]}
            disabled={disabled}
          >
            {/* Selection Indicator */}
            <View
              style={[
                styles.radioOuter,
                {
                  borderColor: isSelected ? palette.tint : palette.border,
                },
              ]}
            >
              {isSelected && (
                <View
                  style={[styles.radioInner, { backgroundColor: palette.tint }]}
                />
              )}
            </View>

            {/* Content */}
            <View style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <Ionicons
                  name={option.icon}
                  size={20}
                  color={isSelected ? palette.tint : palette.icon}
                />
                <ThemedText
                  type="defaultSemiBold"
                  style={{ color: isSelected ? palette.tint : palette.foreground }}
                >
                  {option.label}
                </ThemedText>
              </View>
              <ThemedText style={[styles.cardDescription, { color: palette.muted }]}>
                {option.description}
              </ThemedText>

              {/* Monthly Estimate */}
              {monthlyEstimate !== null && (
                <View style={styles.estimateRow}>
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
                </View>
              )}
            </View>

            {/* Sessions Per Month Badge */}
            <View
              style={[
                styles.sessionsBadge,
                {
                  backgroundColor: isSelected
                    ? withAlpha(palette.tint, 0.15)
                    : palette.background,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.sessionsText,
                  { color: isSelected ? palette.tint : palette.muted },
                ]}
              >
                {option.sessionsPerMonth}x/mo
              </ThemedText>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Compact FrequencyPicker for inline forms
 */
export function FrequencyPickerCompact({
  value,
  onChange,
  disabled = false,
}: Pick<FrequencyPickerProps, 'value' | 'onChange' | 'disabled'>) {
  const { colors: palette } = useTheme();

  return (
    <View style={styles.compactContainer}>
      <ThemedText style={[styles.compactLabel, { color: palette.muted }]}>
        Frequency:
      </ThemedText>
      <View style={styles.compactOptions}>
        {FREQUENCY_OPTIONS.map((option) => {
          const isSelected = value === option.value;

          return (
            <Pressable
              key={option.value}
              onPress={() => !disabled && onChange(option.value)}
              style={[
                styles.compactOption,
                {
                  backgroundColor: isSelected ? palette.tint : 'transparent',
                  borderColor: isSelected ? palette.tint : palette.border,
                  opacity: disabled ? 0.5 : 1,
                },
              ]}
              disabled={disabled}
            >
              <ThemedText
                style={[
                  styles.compactOptionText,
                  { color: isSelected ? palette.onPrimary : palette.foreground },
                ]}
              >
                {option.label.charAt(0)}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
      <ThemedText style={[styles.compactValue, { color: palette.foreground }]}>
        {getFrequencyLabel(value)}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  // Pills variant
  pillsContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  pill: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: {
    ...Typography.smallSemiBold,
  },

  // Cards variant
  cardsContainer: {
    gap: Spacing.sm,
  },
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
  cardContent: {
    flex: 1,
    gap: Spacing.micro,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  cardDescription: {
    ...Typography.small,
  },
  estimateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    marginTop: Spacing.xxs,
  },
  estimateLabel: {
    ...Typography.caption,
  },
  estimateValue: {
    ...Typography.caption,
    fontWeight: '600',
  },
  sessionsBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
  sessionsText: {
    ...Typography.caption,
    fontWeight: '600',
  },

  // Compact variant
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  compactLabel: {
    ...Typography.small,
  },
  compactOptions: {
    flexDirection: 'row',
    gap: Spacing.xxs,
  },
  compactOption: {
    width: 28,
    height: 28,
    borderRadius: Radii.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactOptionText: {
    ...Typography.caption,
    fontWeight: '700',
  },
  compactValue: {
    ...Typography.small,
    fontWeight: '500',
  },
});
