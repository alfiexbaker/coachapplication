import React from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';

interface MedicalTagListFormProps {
  allergies: string[];
  allergyInput: string;
  medicalConditions: string[];
  conditionInput: string;
  medications: string[];
  medicationInput: string;
  onAllergiesChange: (value: string[]) => void;
  onAllergyInputChange: (value: string) => void;
  onAddAllergy: () => void;
  onMedicalConditionsChange: (value: string[]) => void;
  onConditionInputChange: (value: string) => void;
  onAddCondition: () => void;
  onMedicationsChange: (value: string[]) => void;
  onMedicationInputChange: (value: string) => void;
  onAddMedication: () => void;
  palette: ThemeColors;
  showInfoCard?: boolean;
}

function TagInputSection({
  label,
  items,
  inputValue,
  placeholder,
  tagColor,
  palette,
  onInputChange,
  onAdd,
  onRemove,
}: {
  label: string;
  items: string[];
  inputValue: string;
  placeholder: string;
  tagColor: string;
  palette: ThemeColors;
  onInputChange: (value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <View style={styles.field}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <Row style={styles.tagInputRow}>
        <TextInput
          style={[styles.input, { flex: 1, borderColor: palette.border, color: palette.text }]}
          placeholder={placeholder}
          placeholderTextColor={palette.muted}
          value={inputValue}
          onChangeText={onInputChange}
          onSubmitEditing={onAdd}

            maxLength={100}
          />
        <Clickable
          accessibilityLabel="Add tag"
          onPress={onAdd}
          style={[styles.addTagButton, { backgroundColor: palette.tint }]}
        >
          <Ionicons name="add" size={20} color={palette.onPrimary} />
        </Clickable>
      </Row>
      {items.length > 0 && (
        <Row style={styles.tagList}>
          {items.map((item, index) => (
            <View
              key={index}
              style={[
                styles.tag,
                { backgroundColor: withAlpha(tagColor, 0.09), borderColor: tagColor },
              ]}
            >
              <ThemedText style={{ color: tagColor }}>{item}</ThemedText>
              <Clickable
                onPress={() => onRemove(index)}
                accessibilityLabel={`Remove ${item} tag`}
                style={styles.removeTagButton}
              >
                <Ionicons name="close" size={16} color={tagColor} />
              </Clickable>
            </View>
          ))}
        </Row>
      )}
    </View>
  );
}

export const MedicalTagListForm = React.memo(function MedicalTagListForm({
  allergies,
  allergyInput,
  medicalConditions,
  conditionInput,
  medications,
  medicationInput,
  onAllergiesChange,
  onAllergyInputChange,
  onAddAllergy,
  onMedicalConditionsChange,
  onConditionInputChange,
  onAddCondition,
  onMedicationsChange,
  onMedicationInputChange,
  onAddMedication,
  palette,
  showInfoCard = true,
}: MedicalTagListFormProps) {
  return (
    <View style={styles.stepContent}>
      {showInfoCard ? (
        <SurfaceCard style={styles.infoCard}>
          <Ionicons name="medkit-outline" size={24} color={palette.warning} />
          <ThemedText style={[styles.infoText, { color: palette.muted }]}>
            Medical information is critical for your child&apos;s safety during sessions.
          </ThemedText>
        </SurfaceCard>
      ) : null}

      <TagInputSection
        label="Allergies"
        items={allergies}
        inputValue={allergyInput}
        placeholder="e.g., Peanuts, Bee stings"
        tagColor={palette.error}
        palette={palette}
        onInputChange={onAllergyInputChange}
        onAdd={onAddAllergy}
        onRemove={(index) => onAllergiesChange(allergies.filter((_, i) => i !== index))}
      />

      <TagInputSection
        label="Medical Conditions"
        items={medicalConditions}
        inputValue={conditionInput}
        placeholder="e.g., Asthma, Diabetes"
        tagColor={palette.warning}
        palette={palette}
        onInputChange={onConditionInputChange}
        onAdd={onAddCondition}
        onRemove={(index) =>
          onMedicalConditionsChange(medicalConditions.filter((_, i) => i !== index))
        }
      />

      <TagInputSection
        label="Current Medications"
        items={medications}
        inputValue={medicationInput}
        placeholder="e.g., Ventolin inhaler"
        tagColor={palette.tint}
        palette={palette}
        onInputChange={onMedicationInputChange}
        onAdd={onAddMedication}
        onRemove={(index) => onMedicationsChange(medications.filter((_, i) => i !== index))}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  stepContent: {
    gap: Spacing.md,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  infoText: {
    flex: 1,
    ...Typography.small,
    lineHeight: 18,
  },
  field: {
    gap: Spacing.xs,
  },
  label: {
    ...Typography.bodySmall,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1.5,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    ...Typography.body,
  },
  tagInputRow: {
    gap: Spacing.xs,
  },
  addTagButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagList: {
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  tag: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  removeTagButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
