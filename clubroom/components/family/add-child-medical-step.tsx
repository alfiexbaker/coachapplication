import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { Radii, Spacing, Typography , withAlpha } from '@/constants/theme';
import { useTheme, type ThemeColors } from '@/hooks/useTheme';
import { type Disability, DISABILITY_TYPES } from '@/services/child-service';

// ─── Types ──────────────────────────────────────────────────────

export interface AddChildMedicalStepProps {
  /** Child's first name for personalised labels */
  firstName: string;
  // Special needs sub-step
  hasSpecialNeeds: boolean | null;
  disabilities: Disability[];
  selectedDisabilityType: string | null;
  disabilityDescription: string;
  communicationNotes: string;
  behavioralNotes: string;
  onHasSpecialNeedsChange: (value: boolean) => void;
  onDisabilitiesChange: (value: Disability[]) => void;
  onSelectedDisabilityTypeChange: (value: string | null) => void;
  onDisabilityDescriptionChange: (value: string) => void;
  onCommunicationNotesChange: (value: string) => void;
  onBehavioralNotesChange: (value: string) => void;
  onAddDisability: () => void;
  // Medical sub-step
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
  /** Which sub-step to render: special_needs or medical */
  variant: 'special_needs' | 'medical';
}

// ─── Component ──────────────────────────────────────────────────

function AddChildMedicalStepInner(props: AddChildMedicalStepProps) {
  const { colors: palette } = useTheme();

  if (props.variant === 'special_needs') {
    return <SpecialNeedsContent {...props} palette={palette} />;
  }

  return <MedicalContent {...props} palette={palette} />;
}

// ─── Special Needs ──────────────────────────────────────────────

function SpecialNeedsContent({
  firstName,
  hasSpecialNeeds,
  disabilities,
  selectedDisabilityType,
  disabilityDescription,
  communicationNotes,
  behavioralNotes,
  onHasSpecialNeedsChange,
  onDisabilitiesChange,
  onSelectedDisabilityTypeChange,
  onDisabilityDescriptionChange,
  onCommunicationNotesChange,
  onBehavioralNotesChange,
  onAddDisability,
  palette,
}: AddChildMedicalStepProps & { palette: ThemeColors }) {
  return (
    <View style={styles.stepContent}>
      <SurfaceCard style={styles.infoCard}>
        <Ionicons name="heart-outline" size={24} color={palette.tint} />
        <ThemedText style={[styles.infoText, { color: palette.muted }]}>
          This information helps coaches provide the best experience for your child.
          It will be shared with coaches who work with {firstName || 'your child'}.
        </ThemedText>
      </SurfaceCard>

      <View style={styles.field}>
        <ThemedText style={styles.label}>
          Does {firstName || 'your child'} have any disabilities or special needs? *
        </ThemedText>
        <View style={styles.yesNoRow}>
          <Clickable
            onPress={() => onHasSpecialNeedsChange(true)}
            style={[
              styles.yesNoButton,
              {
                backgroundColor: hasSpecialNeeds === true ? palette.tint : palette.surface,
                borderColor: hasSpecialNeeds === true ? palette.tint : palette.border,
              },
            ]}
          >
            <ThemedText
              style={[
                styles.yesNoText,
                { color: hasSpecialNeeds === true ? palette.onPrimary : palette.text },
              ]}
            >
              Yes
            </ThemedText>
          </Clickable>
          <Clickable
            onPress={() => onHasSpecialNeedsChange(false)}
            style={[
              styles.yesNoButton,
              {
                backgroundColor: hasSpecialNeeds === false ? palette.tint : palette.surface,
                borderColor: hasSpecialNeeds === false ? palette.tint : palette.border,
              },
            ]}
          >
            <ThemedText
              style={[
                styles.yesNoText,
                { color: hasSpecialNeeds === false ? palette.onPrimary : palette.text },
              ]}
            >
              No
            </ThemedText>
          </Clickable>
        </View>
      </View>

      {hasSpecialNeeds === true && (
        <>
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

          <View style={styles.field}>
            <ThemedText style={styles.label}>Communication Preferences</ThemedText>
            <ThemedText style={[styles.hint, { color: palette.muted }]}>
              How does {firstName || 'your child'} communicate best?
            </ThemedText>
            <TextInput
              style={[styles.textArea, { borderColor: palette.border, color: palette.text }]}
              placeholder="e.g., Responds well to visual cues, prefers direct instructions..."
              placeholderTextColor={palette.muted}
              value={communicationNotes}
              onChangeText={onCommunicationNotesChange}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.field}>
            <ThemedText style={styles.label}>Behavioral Considerations</ThemedText>
            <ThemedText style={[styles.hint, { color: palette.muted }]}>
              Anything coaches should know about behavior or triggers?
            </ThemedText>
            <TextInput
              style={[styles.textArea, { borderColor: palette.border, color: palette.text }]}
              placeholder="e.g., May need breaks, gets overwhelmed in large groups..."
              placeholderTextColor={palette.muted}
              value={behavioralNotes}
              onChangeText={onBehavioralNotesChange}
              multiline
              numberOfLines={3}
            />
          </View>
        </>
      )}
    </View>
  );
}

// ─── Medical Info ───────────────────────────────────────────────

function MedicalContent({
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
}: AddChildMedicalStepProps & { palette: ThemeColors }) {
  return (
    <View style={styles.stepContent}>
      <SurfaceCard style={styles.infoCard}>
        <Ionicons name="medkit-outline" size={24} color={palette.warning} />
        <ThemedText style={[styles.infoText, { color: palette.muted }]}>
          Medical information is critical for your child&apos;s safety during sessions.
        </ThemedText>
      </SurfaceCard>

      {/* Allergies */}
      <View style={styles.field}>
        <ThemedText style={styles.label}>Allergies</ThemedText>
        <View style={styles.tagInputRow}>
          <TextInput
            style={[styles.input, { flex: 1, borderColor: palette.border, color: palette.text }]}
            placeholder="e.g., Peanuts, Bee stings"
            placeholderTextColor={palette.muted}
            value={allergyInput}
            onChangeText={onAllergyInputChange}
            onSubmitEditing={onAddAllergy}
          />
          <Clickable
            onPress={onAddAllergy}
            style={[styles.addTagButton, { backgroundColor: palette.tint }]}
          >
            <Ionicons name="add" size={20} color={palette.onPrimary} />
          </Clickable>
        </View>
        {allergies.length > 0 && (
          <View style={styles.tagList}>
            {allergies.map((item, index) => (
              <View
                key={index}
                style={[
                  styles.tag,
                  { backgroundColor: withAlpha(palette.error, 0.09), borderColor: palette.error },
                ]}
              >
                <ThemedText style={{ color: palette.error }}>{item}</ThemedText>
                <Clickable
                  onPress={() =>
                    onAllergiesChange(allergies.filter((_, i) => i !== index))
                  }
                >
                  <Ionicons name="close" size={16} color={palette.error} />
                </Clickable>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Medical Conditions */}
      <View style={styles.field}>
        <ThemedText style={styles.label}>Medical Conditions</ThemedText>
        <View style={styles.tagInputRow}>
          <TextInput
            style={[styles.input, { flex: 1, borderColor: palette.border, color: palette.text }]}
            placeholder="e.g., Asthma, Diabetes"
            placeholderTextColor={palette.muted}
            value={conditionInput}
            onChangeText={onConditionInputChange}
            onSubmitEditing={onAddCondition}
          />
          <Clickable
            onPress={onAddCondition}
            style={[styles.addTagButton, { backgroundColor: palette.tint }]}
          >
            <Ionicons name="add" size={20} color={palette.onPrimary} />
          </Clickable>
        </View>
        {medicalConditions.length > 0 && (
          <View style={styles.tagList}>
            {medicalConditions.map((item, index) => (
              <View
                key={index}
                style={[
                  styles.tag,
                  { backgroundColor: withAlpha(palette.warning, 0.09), borderColor: palette.warning },
                ]}
              >
                <ThemedText style={{ color: palette.warning }}>{item}</ThemedText>
                <Clickable
                  onPress={() =>
                    onMedicalConditionsChange(
                      medicalConditions.filter((_, i) => i !== index),
                    )
                  }
                >
                  <Ionicons name="close" size={16} color={palette.warning} />
                </Clickable>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Medications */}
      <View style={styles.field}>
        <ThemedText style={styles.label}>Current Medications</ThemedText>
        <View style={styles.tagInputRow}>
          <TextInput
            style={[styles.input, { flex: 1, borderColor: palette.border, color: palette.text }]}
            placeholder="e.g., Ventolin inhaler"
            placeholderTextColor={palette.muted}
            value={medicationInput}
            onChangeText={onMedicationInputChange}
            onSubmitEditing={onAddMedication}
          />
          <Clickable
            onPress={onAddMedication}
            style={[styles.addTagButton, { backgroundColor: palette.tint }]}
          >
            <Ionicons name="add" size={20} color={palette.onPrimary} />
          </Clickable>
        </View>
        {medications.length > 0 && (
          <View style={styles.tagList}>
            {medications.map((item, index) => (
              <View
                key={index}
                style={[
                  styles.tag,
                  { backgroundColor: withAlpha(palette.tint, 0.09), borderColor: palette.tint },
                ]}
              >
                <ThemedText style={{ color: palette.tint }}>{item}</ThemedText>
                <Clickable
                  onPress={() =>
                    onMedicationsChange(medications.filter((_, i) => i !== index))
                  }
                >
                  <Ionicons name="close" size={16} color={palette.tint} />
                </Clickable>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────

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
  hint: {
    ...Typography.small,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    ...Typography.body,
  },
  textArea: {
    borderWidth: 1.5,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    ...Typography.body,
    minHeight: 80,
    textAlignVertical: 'top',
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
  yesNoRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  yesNoButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  yesNoText: {
    ...Typography.bodySemiBold,
  },
  addDescriptionBox: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  addButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing.md,
  },
  tagInputRow: {
    flexDirection: 'row',
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
});

// ─── Exports ────────────────────────────────────────────────────

export const AddChildMedicalStep = React.memo(AddChildMedicalStepInner);
export default AddChildMedicalStep;
