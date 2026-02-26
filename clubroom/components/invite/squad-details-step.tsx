/**
 * SquadDetailsStep — Session details step for the squad bulk invite wizard.
 *
 * Contains session title, type/focus chip selectors, notes, and price inputs.
 */

import React, { memo } from 'react';
import { StyleSheet, TextInput } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Column } from '@/components/primitives';
import { ThemedText } from '@/components/themed-text';
import { ChipSelector } from '@/components/invite/chip-selector';
import { Spacing, Radii, Typography } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import { COACHING_FOCUSES } from '@/constants/football-registry';

const SESSION_TYPES = ['1:1 Coaching', 'Group Session', 'Assessment', 'Training'] as const;
const FOCUSES = COACHING_FOCUSES;

export interface SquadDetailsStepProps {
  sessionTitle: string;
  sessionType: string;
  focus: string;
  notes: string;
  price: string;
  onSessionTitleChange: (value: string) => void;
  onSessionTypeChange: (value: string) => void;
  onFocusChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onPriceChange: (value: string) => void;
  colors: ThemeColors;
}

export const SquadDetailsStep = memo(function SquadDetailsStep({
  sessionTitle,
  sessionType,
  focus,
  notes,
  price,
  onSessionTitleChange,
  onSessionTypeChange,
  onFocusChange,
  onNotesChange,
  onPriceChange,
  colors,
}: SquadDetailsStepProps) {
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

        <Column gap="xs">
          <ThemedText style={styles.formLabel}>Session Title</ThemedText>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            placeholder="e.g., U15 Squad Training"
            placeholderTextColor={colors.muted}
            value={sessionTitle}
            onChangeText={onSessionTitleChange}
            accessibilityLabel="Session title"

            maxLength={100}
          />
        </Column>

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
          <ThemedText style={styles.formLabel}>Notes (optional)</ThemedText>
          <TextInput
            style={[styles.textArea, { color: colors.text, borderColor: colors.border }]}
            placeholder="Additional details about the session..."
            placeholderTextColor={colors.muted}
            value={notes}
            onChangeText={onNotesChange}
            multiline
            numberOfLines={3}
            accessibilityLabel="Session notes"

            maxLength={500}
          />
        </Column>

        <Column gap="xs">
          <ThemedText style={styles.formLabel}>Price (optional)</ThemedText>
          <TextInput
            style={[
              styles.input,
              { color: colors.text, borderColor: priceError ? colors.error : colors.border },
            ]}
            placeholder="e.g., 25"
            placeholderTextColor={colors.muted}
            value={price}
            onChangeText={(value) => onPriceChange(value.replace(/[^0-9]/g, ''))}
            keyboardType="numeric"
            accessibilityLabel="Session price"
          />
          <ThemedText style={[Typography.caption, { color: priceError ? colors.error : colors.muted }]}>
            {priceError ?? 'Whole pounds only (£10-£200)'}
          </ThemedText>
        </Column>
      </Column>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  stepTitle: {
    ...Typography.title,
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
