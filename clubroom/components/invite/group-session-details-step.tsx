/**
 * GroupSessionDetailsStep — Session details step for the group invite wizard.
 *
 * Shows a summary of selected athletes, session type/focus chip selectors,
 * price input, and notes input.
 */

import React, { memo } from 'react';
import { StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Row, Column } from '@/components/primitives';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { ChipSelector } from '@/components/invite/chip-selector';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import { COACHING_FOCUSES } from '@/constants/football-registry';

const SESSION_TYPES = ['1:1 Coaching', 'Group Session', 'Assessment', 'Trial'] as const;
const FOCUSES = COACHING_FOCUSES;

export interface GroupSessionDetailsStepProps {
  athleteCount: number;
  sessionType: string;
  focus: string;
  price: string;
  notes: string;
  onSessionTypeChange: (value: string) => void;
  onFocusChange: (value: string) => void;
  onPriceChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onEditAthletes: () => void;
  colors: ThemeColors;
}

export const GroupSessionDetailsStep = memo(function GroupSessionDetailsStep({
  athleteCount,
  sessionType,
  focus,
  price,
  notes,
  onSessionTypeChange,
  onFocusChange,
  onPriceChange,
  onNotesChange,
  onEditAthletes,
  colors,
}: GroupSessionDetailsStepProps) {
  const priceError = (() => {
    const raw = price.trim();
    if (!raw) return null;
    if (!/^\d+$/.test(raw)) return 'Price must be between £10 and £200 (whole pounds only)';
    const parsed = Number.parseInt(raw, 10);
    if (parsed < 10 || parsed > 200) return 'Price must be between £10 and £200 (whole pounds only)';
    return null;
  })();
  return (
    <Animated.View entering={FadeInDown.springify()}>
      <Column gap="md">
        <ThemedText type="subtitle" style={styles.stepTitle}>
          Session Details
        </ThemedText>

        {/* Selected athletes summary */}
        <Row
          align="center"
          gap="sm"
          paddingH="md"
          paddingV="sm"
          style={[styles.athletesSummary, { backgroundColor: withAlpha(colors.tint, 0.06) }]}
        >
          <Ionicons name="people" size={18} color={colors.tint} />
          <ThemedText style={{ color: colors.tint, flex: 1 }}>
            {athleteCount} athlete{athleteCount !== 1 ? 's' : ''} selected
          </ThemedText>
          <Clickable
            onPress={onEditAthletes}
            accessibilityLabel="Edit selected athletes"
            accessibilityRole="button"
          >
            <ThemedText style={{ color: colors.tint, ...Typography.bodySemiBold }}>Edit</ThemedText>
          </Clickable>
        </Row>

        <ChipSelector
          label="Session Type"
          options={SESSION_TYPES}
          selected={sessionType}
          onSelect={onSessionTypeChange}
          colors={colors}
        />

        <ChipSelector
          label="Focus Area"
          options={FOCUSES}
          selected={focus}
          onSelect={onFocusChange}
          colors={colors}
        />

        <Column gap="xs">
          <ThemedText style={styles.formLabel}>Price per Athlete (optional)</ThemedText>
          <TextInput
            style={[
              styles.input,
              { color: colors.text, borderColor: priceError ? colors.error : colors.border },
            ]}
            placeholder="e.g., 50"
            placeholderTextColor={colors.muted}
            value={price}
            onChangeText={(value) => onPriceChange(value.replace(/[^0-9]/g, ''))}
            keyboardType="numeric"
            accessibilityLabel="Price per athlete"
          />
          <ThemedText style={[Typography.caption, { color: priceError ? colors.error : colors.muted }]}>
            {priceError ?? 'Whole pounds only (£10-£200)'}
          </ThemedText>
        </Column>

        <Column gap="xs">
          <ThemedText style={styles.formLabel}>Notes for Parents</ThemedText>
          <TextInput
            style={[styles.textArea, { color: colors.text, borderColor: colors.border }]}
            placeholder="e.g., Please bring water and shin guards..."
            placeholderTextColor={colors.muted}
            value={notes}
            onChangeText={onNotesChange}
            multiline
            numberOfLines={3}
            accessibilityLabel="Notes for parents"
          />
        </Column>
      </Column>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  stepTitle: {
    ...Typography.title,
  },
  athletesSummary: {
    borderRadius: Radii.md,
  },
  formLabel: {
    ...Typography.bodySmallSemiBold,
    marginBottom: Spacing.xxs,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    ...Typography.body,
  },
  textArea: {
    height: 80,
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.md,
    ...Typography.body,
    textAlignVertical: 'top',
  },
});
