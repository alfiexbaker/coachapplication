/**
 * ChipSelector — Selectable chip row for session types, focus areas, etc.
 *
 * Shared between group and squad invite wizards.
 * Renders a horizontal wrap row of chips, highlighting the selected option.
 */

import React, { memo, useCallback } from 'react';
import { StyleSheet } from 'react-native';

import { Row, Column } from '@/components/primitives';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';

// ─── Single Chip (memo'd) ───────────────────────────────────────────────────

interface ChipItemProps {
  label: string;
  selected: boolean;
  onPress: (label: string) => void;
  colors: ThemeColors;
}

const ChipItem = memo(function ChipItem({ label, selected, onPress, colors }: ChipItemProps) {
  const handlePress = useCallback(() => onPress(label), [onPress, label]);

  return (
    <Clickable
      onPress={handlePress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.tint : colors.surface,
          borderColor: selected ? colors.tint : colors.border,
        },
      ]}
      accessibilityLabel={`${label}${selected ? ', selected' : ''}`}
      accessibilityRole="button"
    >
      <ThemedText
        style={{ color: selected ? colors.onPrimary : colors.text, ...Typography.small }}
      >
        {label}
      </ThemedText>
    </Clickable>
  );
});

// ─── Main Component ─────────────────────────────────────────────────────────

export interface ChipSelectorProps {
  label: string;
  options: readonly string[];
  selected: string;
  onSelect: (value: string) => void;
  colors: ThemeColors;
}

export const ChipSelector = memo(function ChipSelector({
  label,
  options,
  selected,
  onSelect,
  colors,
}: ChipSelectorProps) {
  return (
    <Column gap="xs">
      <ThemedText style={styles.formLabel}>{label}</ThemedText>
      <Row wrap gap="xs">
        {options.map((option) => (
          <ChipItem
            key={option}
            label={option}
            selected={selected === option}
            onPress={onSelect}
            colors={colors}
          />
        ))}
      </Row>
    </Column>
  );
});

const styles = StyleSheet.create({
  formLabel: {
    ...Typography.bodySmallSemiBold,
    marginBottom: Spacing.xxs,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
});
