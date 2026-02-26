import { memo } from 'react';
import { StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing, Radii, Components, Typography } from '@/constants/theme';
import type { useTheme } from '@/hooks/useTheme';
import { FieldLabel } from './trial-discovery-preview';
import { Row } from '@/components/primitives';

type ThemeColors = ReturnType<typeof useTheme>['colors'];

// ─── Validation ─────────────────────────────────────────────────

export interface TrialFormValues {
  trialPrice: string;
  normalPrice: string;
  durationMinutes: string;
  limitPerFamily: string;
  description: string;
}

export function validateTrialForm(values: TrialFormValues): string | null {
  const parsedTrial = parseFloat(values.trialPrice);
  const parsedNormal = parseFloat(values.normalPrice);
  const parsedDuration = parseInt(values.durationMinutes, 10);
  const parsedLimit = parseInt(values.limitPerFamily, 10);

  if (isNaN(parsedTrial) || parsedTrial < 0) return 'Please enter a valid trial price.';
  if (isNaN(parsedNormal) || parsedNormal <= 0) return 'Please enter a valid normal price.';
  if (parsedTrial >= parsedNormal) return 'Trial price should be less than the normal price.';
  if (isNaN(parsedDuration) || parsedDuration < 15)
    return 'Session duration must be at least 15 minutes.';
  if (isNaN(parsedLimit) || parsedLimit < 1) return 'Limit per family must be at least 1.';
  return null;
}

// ─── TrialFormFields ────────────────────────────────────────────

export interface TrialFormFieldsProps {
  trialPrice: string;
  normalPrice: string;
  durationMinutes: string;
  limitPerFamily: string;
  description: string;
  onTrialPriceChange: (v: string) => void;
  onNormalPriceChange: (v: string) => void;
  onDurationChange: (v: string) => void;
  onLimitChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  palette: ThemeColors;
}

export const TrialFormFields = memo(function TrialFormFields({
  trialPrice,
  normalPrice,
  durationMinutes,
  limitPerFamily,
  description,
  onTrialPriceChange,
  onNormalPriceChange,
  onDurationChange,
  onLimitChange,
  onDescriptionChange,
  palette,
}: TrialFormFieldsProps) {
  return (
    <SurfaceCard style={styles.fieldsCard}>
      <FieldLabel label="Trial Price" hint="What you charge for the trial" palette={palette} />
      <Row style={[styles.inputRow, { borderColor: palette.border }]}>
        <ThemedText style={[Typography.body, { color: palette.muted }]}>{'\u00A3'}</ThemedText>
        <TextInput
          style={[styles.input, { color: palette.text }]}
          value={trialPrice}
          onChangeText={onTrialPriceChange}
          keyboardType="decimal-pad"
          placeholder="15"
          placeholderTextColor={palette.muted}

            maxLength={10}
          />
      </Row>

      <FieldLabel
        label="Normal Session Price"
        hint="Your regular rate for comparison"
        palette={palette}
      />
      <Row style={[styles.inputRow, { borderColor: palette.border }]}>
        <ThemedText style={[Typography.body, { color: palette.muted }]}>{'\u00A3'}</ThemedText>
        <TextInput
          style={[styles.input, { color: palette.text }]}
          value={normalPrice}
          onChangeText={onNormalPriceChange}
          keyboardType="decimal-pad"
          placeholder="45"
          placeholderTextColor={palette.muted}

            maxLength={10}
          />
      </Row>

      <FieldLabel label="Duration" hint="Length of the trial session" palette={palette} />
      <Row style={[styles.inputRow, { borderColor: palette.border }]}>
        <TextInput
          style={[styles.input, { color: palette.text }]}
          value={durationMinutes}
          onChangeText={onDurationChange}
          keyboardType="number-pad"
          placeholder="60"
          placeholderTextColor={palette.muted}

            maxLength={10}
          />
        <ThemedText style={[Typography.body, { color: palette.muted }]}>minutes</ThemedText>
      </Row>

      <FieldLabel
        label="Limit per Family"
        hint="How many trial sessions each family can book"
        palette={palette}
      />
      <Row style={[styles.inputRow, { borderColor: palette.border }]}>
        <TextInput
          style={[styles.input, { color: palette.text }]}
          value={limitPerFamily}
          onChangeText={onLimitChange}
          keyboardType="number-pad"
          placeholder="1"
          placeholderTextColor={palette.muted}

            maxLength={10}
          />
        <ThemedText style={[Typography.body, { color: palette.muted }]}>session(s)</ThemedText>
      </Row>

      <FieldLabel
        label="Description"
        hint="What parents will see about the trial"
        palette={palette}
      />
      <TextInput
        style={[styles.descriptionInput, { borderColor: palette.border, color: palette.text }]}
        value={description}
        onChangeText={onDescriptionChange}
        multiline
        numberOfLines={3}
        placeholder="Describe your trial offering..."
        placeholderTextColor={palette.muted}
        textAlignVertical="top"

            maxLength={500}
          />
    </SurfaceCard>
  );
});

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  fieldsCard: { gap: Spacing.sm, marginBottom: Spacing.sm },
  inputRow: {
    alignItems: 'center',
    gap: Spacing.xs,
    height: Components.input.height,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.sm,
  },
  input: { flex: 1, height: Components.input.height, ...Typography.body },
  descriptionInput: {
    minHeight: 80,
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    ...Typography.body,
  },
});
