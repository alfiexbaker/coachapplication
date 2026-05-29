/**
 * Extracted sub-components for SessionTypeModal.
 *
 * SegmentSelector — generic segment picker (type/duration).
 * CapacityStepper — increment/decrement capacity.
 * PriceInput — £ prefixed price field.
 */

import React from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';

// ─── SegmentSelector ─────────────────────────────────────────────────────────

interface SegmentOption<T> {
  key: T;
  label: string;
}

interface SegmentSelectorProps<T extends string | number> {
  label: string;
  options: SegmentOption<T>[];
  selected: T;
  onSelect: (value: T) => void;
  palette: ThemeColors;
}

export const SegmentSelector = function SegmentSelector<T extends string | number>({
  label,
  options,
  selected,
  onSelect,
  palette,
}: SegmentSelectorProps<T>) {
  return (
    <View style={styles.field}>
      <ThemedText style={[styles.fieldLabel, { color: palette.muted }]}>{label}</ThemedText>
      <Row style={styles.segmentRow}>
        {options.map((opt) => (
          <Clickable
            key={String(opt.key)}
            onPress={() => onSelect(opt.key)}
            style={[
              styles.segment,
              {
                backgroundColor: selected === opt.key ? palette.tint : palette.background,
                borderColor: selected === opt.key ? palette.tint : palette.border,
              },
            ]}
          >
            <ThemedText
              style={[
                styles.segmentText,
                { color: selected === opt.key ? palette.onPrimary : palette.text },
              ]}
            >
              {opt.label}
            </ThemedText>
          </Clickable>
        ))}
      </Row>
    </View>
  );
} as <T extends string | number>(props: SegmentSelectorProps<T>) => React.ReactElement;

// ─── CapacityStepper ─────────────────────────────────────────────────────────

interface CapacityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  palette: ThemeColors;
}

const renderCapacityStepper = function renderCapacityStepper({
  value,
  onChange,
  min = 1,
  max = 20,
  palette,
}: CapacityStepperProps) {
  return (
    <View style={[styles.field, { flex: 1 }]}>
      <ThemedText style={[styles.fieldLabel, { color: palette.muted }]}>Max Athletes</ThemedText>
      <Row
        style={[
          styles.stepperRow,
          { borderColor: palette.border, backgroundColor: palette.background },
        ]}
      >
        <Clickable
          accessibilityLabel="Decrease value"
          onPress={() => onChange(Math.max(min, value - 1))}
          style={styles.stepperBtn}
        >
          <Ionicons name="remove" size={18} color={palette.text} />
        </Clickable>
        <ThemedText type="defaultSemiBold" style={styles.stepperValue}>
          {value}
        </ThemedText>
        <Clickable
          accessibilityLabel="Increase value"
          onPress={() => onChange(Math.min(max, value + 1))}
          style={styles.stepperBtn}
        >
          <Ionicons name="add" size={18} color={palette.text} />
        </Clickable>
      </Row>
    </View>
  );
};
export const CapacityStepper = renderCapacityStepper;

// ─── PriceInput ──────────────────────────────────────────────────────────────

interface PriceInputProps {
  value: string;
  onChange: (value: string) => void;
  palette: ThemeColors;
}

const renderPriceInput = function renderPriceInput({ value, onChange, palette }: PriceInputProps) {
  return (
    <View style={[styles.field, { flex: 1 }]}>
      <ThemedText style={[styles.fieldLabel, { color: palette.muted }]}>Price per Head</ThemedText>
      <Row
        style={[
          styles.priceRow,
          { borderColor: palette.border, backgroundColor: palette.background },
        ]}
      >
        <ThemedText style={{ color: palette.muted }}>£</ThemedText>
        <TextInput
          style={[styles.priceInput, { color: palette.text }]}
          placeholder="0"
          placeholderTextColor={palette.muted}
          value={value}
          onChangeText={onChange}
          keyboardType="numeric"
          maxLength={10}
        />
      </Row>
    </View>
  );
};
export const PriceInput = renderPriceInput;

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  field: { gap: Spacing.xs },
  fieldLabel: {
    ...Typography.caption,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  segmentRow: {
    gap: Spacing.xs,
  },
  segment: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  segmentText: { ...Typography.smallSemiBold },
  stepperRow: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radii.md,
    overflow: 'hidden',
  },
  stepperBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  stepperValue: {
    flex: 1,
    textAlign: 'center',
  },
  priceRow: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingLeft: Spacing.md,
  },
  priceInput: {
    flex: 1,
    padding: Spacing.md,
    paddingLeft: Spacing.xs,
    ...Typography.body,
  },
});
