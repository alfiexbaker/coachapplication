import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';

import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Radii, Spacing, Typography } from '@/constants/theme';
import { RecurrenceFrequency } from '@/constants/types';
import { getFrequencyLabel } from '@/services/recurring-booking-service';
import { useTheme } from '@/hooks/useTheme';
import {
  FREQUENCY_OPTIONS,
  FrequencyCardOption,
  FrequencyPillOption,
} from './frequency-picker-sections';

// ─── FrequencyPicker ──────────────────────────────────────────────────────────

interface FrequencyPickerProps {
  value: RecurrenceFrequency;
  onChange: (frequency: RecurrenceFrequency) => void;
  pricePerSession?: number;
  disabled?: boolean;
  variant?: 'cards' | 'pills';
}

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
      <Row gap="sm">
        {FREQUENCY_OPTIONS.map((option) => (
          <FrequencyPillOption
            key={option.value}
            option={option}
            isSelected={value === option.value}
            onPress={() => !disabled && onChange(option.value)}
            disabled={disabled}
            palette={palette}
          />
        ))}
      </Row>
    );
  }

  return (
    <View style={styles.cardsContainer}>
      {FREQUENCY_OPTIONS.map((option) => (
        <FrequencyCardOption
          key={option.value}
          option={option}
          isSelected={value === option.value}
          monthlyEstimate={pricePerSession ? pricePerSession * option.sessionsPerMonth : null}
          onPress={() => !disabled && onChange(option.value)}
          disabled={disabled}
          palette={palette}
        />
      ))}
    </View>
  );
}

// ─── FrequencyPickerCompact ─────────────────────────────────────────────────

export function FrequencyPickerCompact({
  value,
  onChange,
  disabled = false,
}: Pick<FrequencyPickerProps, 'value' | 'onChange' | 'disabled'>) {
  const { colors: palette } = useTheme();

  return (
    <Row align="center" gap="sm">
      <ThemedText style={[styles.compactLabel, { color: palette.muted }]}>Frequency:</ThemedText>
      <Row gap="xxs">
        {FREQUENCY_OPTIONS.map((option) => {
          const isSelected = value === option.value;
          return (
            <Clickable
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
            </Clickable>
          );
        })}
      </Row>
      <ThemedText style={[styles.compactValue, { color: palette.foreground }]}>
        {getFrequencyLabel(value)}
      </ThemedText>
    </Row>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  cardsContainer: { gap: Spacing.sm },
  compactLabel: { ...Typography.small },
  compactOption: {
    width: 28,
    height: 28,
    borderRadius: Radii.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactOptionText: { ...Typography.caption, fontWeight: '700' },
  compactValue: { ...Typography.small, fontWeight: '500' },
});
