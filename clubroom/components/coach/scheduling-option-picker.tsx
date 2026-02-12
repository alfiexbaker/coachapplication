/**
 * OptionPicker — Reusable grid of selectable option cards for scheduling rules.
 */

import React, { memo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
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

function OptionPickerInner<T extends number>({
  options,
  selectedValue,
  onSelect,
}: OptionPickerProps<T>) {
  const { colors: palette } = useTheme();
  const twoColumnLayout = options.length > 4;

  return (
    <Row style={styles.optionsGrid}>
      {options.map((option) => {
        const isSelected = option.value === selectedValue;
        return (
          <Clickable
            key={option.value}
            onPress={() => {
              if (Platform.OS !== 'web') {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              onSelect(option.value as T);
            }}
            style={[
              styles.optionCard,
              twoColumnLayout ? styles.optionCardTwoColumn : styles.optionCardThreeColumn,
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
    gap: Spacing.xs,
  },
  optionCard: {
    minHeight: 72,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.md,
    position: 'relative',
    justifyContent: 'center',
  },
  optionCardTwoColumn: {
    width: '48.5%',
  },
  optionCardThreeColumn: {
    width: '31.5%',
  },
  optionLabel: {
    ...Typography.bodySmallSemiBold,
    textAlign: 'left',
    paddingRight: Spacing.md,
  },
  optionDesc: {
    ...Typography.caption,
    textAlign: 'left',
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
