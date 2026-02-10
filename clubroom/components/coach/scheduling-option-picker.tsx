/**
 * OptionPicker — Reusable grid of selectable option cards for scheduling rules.
 */

import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';

interface OptionPickerProps<T> {
  options: { value: T; label: string; description: string }[];
  selectedValue: T;
  onSelect: (value: T) => void;
}

function OptionPickerInner<T extends number>({ options, selectedValue, onSelect }: OptionPickerProps<T>) {
  const { colors: palette } = useTheme();

  return (
    <Row style={styles.optionsGrid}>
      {options.map((option) => {
        const isSelected = option.value === selectedValue;
        return (
          <Clickable
            key={option.value}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelect(option.value as T);
            }}
            style={[
              styles.optionCard,
              {
                backgroundColor: isSelected ? withAlpha(palette.tint, 0.07) : palette.background,
                borderColor: isSelected ? palette.tint : palette.border,
                borderWidth: isSelected ? 2 : 1,
              },
            ]}
          >
            <ThemedText
              type="defaultSemiBold"
              style={[styles.optionLabel, { color: isSelected ? palette.tint : palette.text }]}
            >
              {option.label}
            </ThemedText>
            <ThemedText style={[styles.optionDesc, { color: palette.muted }]}>
              {option.description}
            </ThemedText>
            {isSelected && (
              <View style={[styles.checkCircle, { backgroundColor: palette.tint }]}>
                <Ionicons name="checkmark" size={12} color={palette.onPrimary} />
              </View>
            )}
          </Clickable>
        );
      })}
    </Row>
  );
}

export const SchedulingOptionPicker = memo(OptionPickerInner) as typeof OptionPickerInner;

const styles = StyleSheet.create({
  optionsGrid: {
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  optionCard: {
    width: '31%',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.md,
    position: 'relative',
    alignItems: 'center',
  },
  optionLabel: {
    ...Typography.bodySmallSemiBold,
    textAlign: 'center',
  },
  optionDesc: {
    ...Typography.caption,
    textAlign: 'center',
    marginTop: Spacing.micro,
  },
  checkCircle: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
