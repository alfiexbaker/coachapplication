import React from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import { type Disability, DISABILITY_TYPES } from '@/services/child-service';

/* ---------- DisabilitySelector ---------- */

export interface DisabilitySelectorProps {
  disabilities: Disability[];
  selectedDisabilityType: string | null;
  disabilityDescription: string;
  onDisabilitiesChange: (value: Disability[]) => void;
  onSelectedDisabilityTypeChange: (value: string | null) => void;
  onDisabilityDescriptionChange: (value: string) => void;
  onAddDisability: () => void;
  palette: ThemeColors;
}

export const DisabilitySelector = React.memo(function DisabilitySelector({
  disabilities,
  selectedDisabilityType,
  disabilityDescription,
  onDisabilitiesChange,
  onSelectedDisabilityTypeChange,
  onDisabilityDescriptionChange,
  onAddDisability,
  palette,
}: DisabilitySelectorProps) {
  return (
    <View style={styles.field}>
      <ThemedText style={styles.label}>Disabilities</ThemedText>
      <ThemedText style={[styles.hint, { color: palette.muted }]}>
        Select any that apply
      </ThemedText>
      <View style={styles.optionGrid}>
        {DISABILITY_TYPES.map((type) => {
          const isSelected = disabilities.some((d) => d.type === type);
          return (
            <Clickable
              key={type}
              onPress={() => {
                if (isSelected) {
                  onDisabilitiesChange(disabilities.filter((d) => d.type !== type));
                } else {
                  onSelectedDisabilityTypeChange(type);
                }
              }}
              style={[
                styles.optionChip,
                {
                  backgroundColor: isSelected ? withAlpha(palette.tint, 0.09) : palette.surface,
                  borderColor: isSelected ? palette.tint : palette.border,
                },
              ]}
            >
              {isSelected && (
                <Ionicons name="checkmark" size={14} color={palette.tint} />
              )}
              <ThemedText
                style={[
                  styles.optionText,
                  { color: isSelected ? palette.tint : palette.text },
                ]}
              >
                {type}
              </ThemedText>
            </Clickable>
          );
        })}
      </View>

      {selectedDisabilityType && (
        <View
          style={[
            styles.addDescriptionBox,
            { backgroundColor: withAlpha(palette.tint, 0.03), borderColor: palette.border },
          ]}
        >
          <ThemedText type="defaultSemiBold">{selectedDisabilityType}</ThemedText>
          <TextInput
            style={[styles.textArea, { borderColor: palette.border, color: palette.text }]}
            placeholder="Add any details that would help coaches (optional)"
            placeholderTextColor={palette.muted}
            value={disabilityDescription}
            onChangeText={onDisabilityDescriptionChange}
            multiline
            numberOfLines={3}
          />
          <View style={styles.addButtonRow}>
            <Clickable onPress={() => onSelectedDisabilityTypeChange(null)}>
              <ThemedText style={{ color: palette.muted }}>Cancel</ThemedText>
            </Clickable>
            <Button onPress={onAddDisability} size="small">
              Add
            </Button>
          </View>
        </View>
      )}
    </View>
  );
});

/* ---------- Styles ---------- */

const styles = StyleSheet.create({
  field: {
    gap: Spacing.xs,
  },
  label: {
    ...Typography.bodySmall,
    fontWeight: '500',
  },
  hint: {
    ...Typography.small,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    borderWidth: 1.5,
  },
  optionText: {
    ...Typography.small,
    fontWeight: '500',
  },
  addDescriptionBox: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  textArea: {
    borderWidth: 1.5,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    ...Typography.body,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  addButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing.md,
  },
});
