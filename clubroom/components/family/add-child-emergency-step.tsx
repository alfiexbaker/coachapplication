import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { Radii, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { MedicalTagListForm } from './medical-tag-list-form';

// Re-export extracted components for backward compat
export { AddChildConsentsStep } from './add-child-emergency-step-sections';
export type { AddChildConsentsStepProps } from './add-child-emergency-step-sections';

// ─── Types ──────────────────────────────────────────────────────

export interface AddChildEmergencyStepProps {
  firstName: string;
  emergencyName: string;
  emergencyPhone: string;
  emergencyRelation: string;
  secondaryName: string;
  secondaryPhone: string;
  hasMedicalDetails: boolean | null;
  allergies: string[];
  allergyInput: string;
  medicalConditions: string[];
  conditionInput: string;
  medications: string[];
  medicationInput: string;
  emergencyTreatmentConsent: boolean;
  onEmergencyNameChange: (value: string) => void;
  onEmergencyPhoneChange: (value: string) => void;
  onEmergencyRelationChange: (value: string) => void;
  onSecondaryNameChange: (value: string) => void;
  onSecondaryPhoneChange: (value: string) => void;
  onHasMedicalDetailsChange: (value: boolean) => void;
  onAllergiesChange: (value: string[]) => void;
  onAllergyInputChange: (value: string) => void;
  onAddAllergy: () => void;
  onMedicalConditionsChange: (value: string[]) => void;
  onConditionInputChange: (value: string) => void;
  onAddCondition: () => void;
  onMedicationsChange: (value: string[]) => void;
  onMedicationInputChange: (value: string) => void;
  onAddMedication: () => void;
  onEmergencyTreatmentConsentChange: (value: boolean) => void;
}

// ─── Emergency Step ─────────────────────────────────────────────

function AddChildEmergencyStepInner({
  firstName,
  emergencyName,
  emergencyPhone,
  emergencyRelation,
  secondaryName,
  secondaryPhone,
  hasMedicalDetails,
  allergies,
  allergyInput,
  medicalConditions,
  conditionInput,
  medications,
  medicationInput,
  emergencyTreatmentConsent,
  onEmergencyNameChange,
  onEmergencyPhoneChange,
  onEmergencyRelationChange,
  onSecondaryNameChange,
  onSecondaryPhoneChange,
  onHasMedicalDetailsChange,
  onAllergiesChange,
  onAllergyInputChange,
  onAddAllergy,
  onMedicalConditionsChange,
  onConditionInputChange,
  onAddCondition,
  onMedicationsChange,
  onMedicationInputChange,
  onAddMedication,
  onEmergencyTreatmentConsentChange,
}: AddChildEmergencyStepProps) {
  const { colors: palette } = useTheme();

  return (
    <View style={styles.stepContent}>
      <SurfaceCard style={styles.infoCard}>
        <Ionicons name="shield-checkmark-outline" size={24} color={palette.tint} />
        <ThemedText style={[styles.infoText, { color: palette.muted }]}>
          Add the details coaches may need if something goes wrong or {firstName || 'your child'}
          needs support during a session.
        </ThemedText>
      </SurfaceCard>

      <SurfaceCard style={styles.sectionCard}>
        <Column gap="md">
          <View style={styles.field}>
            <ThemedText type="defaultSemiBold">Primary Emergency Contact *</ThemedText>
            <ThemedText style={[styles.sectionHint, { color: palette.muted }]}>
              This person will be called first if we cannot reach you.
            </ThemedText>
          </View>

          <View style={styles.field}>
            <ThemedText style={styles.label}>Full Name *</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: palette.border, color: palette.text }]}
              placeholder="Contact name"
              placeholderTextColor={palette.muted}
              value={emergencyName}
              onChangeText={onEmergencyNameChange}
              autoCapitalize="words"
              maxLength={50}
            />
          </View>

          <View style={styles.field}>
            <ThemedText style={styles.label}>Phone Number *</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: palette.border, color: palette.text }]}
              placeholder="+44 7700 900123"
              placeholderTextColor={palette.muted}
              value={emergencyPhone}
              onChangeText={onEmergencyPhoneChange}
              keyboardType="phone-pad"
              maxLength={20}
            />
          </View>

          <View style={styles.field}>
            <ThemedText style={styles.label}>Relationship to Child *</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: palette.border, color: palette.text }]}
              placeholder="e.g., Mother, Father, Grandparent"
              placeholderTextColor={palette.muted}
              value={emergencyRelation}
              onChangeText={onEmergencyRelationChange}
              maxLength={100}
            />
          </View>

          <View style={[styles.field, { marginTop: Spacing.xs }]}>
            <ThemedText type="defaultSemiBold">Secondary Contact (Optional)</ThemedText>
          </View>

          <View style={styles.field}>
            <ThemedText style={styles.label}>Full Name</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: palette.border, color: palette.text }]}
              placeholder="Secondary contact name"
              placeholderTextColor={palette.muted}
              value={secondaryName}
              onChangeText={onSecondaryNameChange}
              autoCapitalize="words"
              maxLength={50}
            />
          </View>

          <View style={styles.field}>
            <ThemedText style={styles.label}>Phone Number</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: palette.border, color: palette.text }]}
              placeholder="+44 7700 900456"
              placeholderTextColor={palette.muted}
              value={secondaryPhone}
              onChangeText={onSecondaryPhoneChange}
              keyboardType="phone-pad"
              maxLength={20}
            />
          </View>
        </Column>
      </SurfaceCard>

      <SurfaceCard style={styles.sectionCard}>
        <Clickable
          onPress={() => onEmergencyTreatmentConsentChange(!emergencyTreatmentConsent)}
          style={[styles.consentRow, { borderColor: palette.border }]}
          accessibilityLabel="Toggle emergency treatment consent"
        >
          <Column flex gap="micro">
            <ThemedText type="defaultSemiBold">Emergency treatment consent</ThemedText>
            <ThemedText style={[styles.consentDesc, { color: palette.muted }]}>
              Allow urgent medical treatment if a parent cannot be reached in time.
            </ThemedText>
          </Column>
          <View
            style={[
              styles.toggle,
              { backgroundColor: emergencyTreatmentConsent ? palette.success : palette.border },
            ]}
          >
            <View
              style={[
                styles.toggleKnob,
                {
                  backgroundColor: palette.onPrimary,
                  transform: [{ translateX: emergencyTreatmentConsent ? 18 : 2 }],
                },
              ]}
            />
          </View>
        </Clickable>
      </SurfaceCard>

      <SurfaceCard style={styles.sectionCard}>
        <Column gap="md">
          <View style={styles.field}>
            <ThemedText type="defaultSemiBold">Medical details for coaches</ThemedText>
            <ThemedText style={[styles.sectionHint, { color: palette.muted }]}>
              Only include what a coach should know to keep {firstName || 'your child'} safe.
            </ThemedText>
          </View>

          <View style={styles.field}>
            <ThemedText style={styles.label}>
              Does a coach need any medical, allergy, or medication details?
            </ThemedText>
            <Row style={styles.yesNoRow}>
              <Clickable
                onPress={() => onHasMedicalDetailsChange(true)}
                style={[
                  styles.yesNoButton,
                  {
                    backgroundColor:
                      hasMedicalDetails === true ? palette.tint : palette.surface,
                    borderColor: hasMedicalDetails === true ? palette.tint : palette.border,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.yesNoText,
                    { color: hasMedicalDetails === true ? palette.onPrimary : palette.text },
                  ]}
                >
                  Yes
                </ThemedText>
              </Clickable>
              <Clickable
                onPress={() => onHasMedicalDetailsChange(false)}
                style={[
                  styles.yesNoButton,
                  {
                    backgroundColor:
                      hasMedicalDetails === false ? palette.tint : palette.surface,
                    borderColor: hasMedicalDetails === false ? palette.tint : palette.border,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.yesNoText,
                    { color: hasMedicalDetails === false ? palette.onPrimary : palette.text },
                  ]}
                >
                  No
                </ThemedText>
              </Clickable>
            </Row>
          </View>

          {hasMedicalDetails === true ? (
            <MedicalTagListForm
              allergies={allergies}
              allergyInput={allergyInput}
              medicalConditions={medicalConditions}
              conditionInput={conditionInput}
              medications={medications}
              medicationInput={medicationInput}
              onAllergiesChange={onAllergiesChange}
              onAllergyInputChange={onAllergyInputChange}
              onAddAllergy={onAddAllergy}
              onMedicalConditionsChange={onMedicalConditionsChange}
              onConditionInputChange={onConditionInputChange}
              onAddCondition={onAddCondition}
              onMedicationsChange={onMedicationsChange}
              onMedicationInputChange={onMedicationInputChange}
              onAddMedication={onAddMedication}
              palette={palette}
              showInfoCard={false}
            />
          ) : null}
        </Column>
      </SurfaceCard>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  stepContent: {
    gap: Spacing.md,
  },
  infoCard: {
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  sectionCard: {
    gap: Spacing.sm,
  },
  infoText: {
    flex: 1,
    ...Typography.small,
    lineHeight: 18,
  },
  sectionHint: {
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
  yesNoRow: {
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
  consentRow: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.md,
  },
  consentDesc: {
    ...Typography.small,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: Radii.full,
    justifyContent: 'center',
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: Radii.full,
  },
});

// ─── Exports ────────────────────────────────────────────────────

export const AddChildEmergencyStep = AddChildEmergencyStepInner;
export default AddChildEmergencyStep;
