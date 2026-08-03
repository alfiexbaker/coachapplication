import React from 'react';
import { StyleSheet, Switch, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { Radii, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { MedicalTagListForm } from './medical-tag-list-form';

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

  const inputStyle = [
    styles.input,
    {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      color: palette.text,
    },
  ];

  return (
    <View style={styles.stepContent}>
      <ThemedText style={[styles.context, { color: palette.muted }]}>
        Coaches can see these details only when assigned to this player.
      </ThemedText>

      <View style={styles.section}>
        <View style={styles.sectionHeading}>
          <ThemedText type="defaultSemiBold">Emergency contact</ThemedText>
          <ThemedText style={[styles.hint, { color: palette.muted }]}>
            Who should be called first?
          </ThemedText>
        </View>

        <View style={styles.field}>
          <ThemedText style={styles.label}>Full name *</ThemedText>
          <TextInput
            style={inputStyle}
            accessibilityLabel="Emergency contact full name"
            placeholder="Contact name"
            placeholderTextColor={palette.muted}
            value={emergencyName}
            onChangeText={onEmergencyNameChange}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            maxLength={50}
          />
        </View>

        <View style={styles.field}>
          <ThemedText style={styles.label}>Phone number *</ThemedText>
          <TextInput
            style={inputStyle}
            accessibilityLabel="Emergency contact phone number"
            placeholder="07700 900123"
            placeholderTextColor={palette.muted}
            value={emergencyPhone}
            onChangeText={onEmergencyPhoneChange}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            maxLength={20}
          />
        </View>

        <View style={styles.field}>
          <ThemedText style={styles.label}>Relationship to player *</ThemedText>
          <TextInput
            style={inputStyle}
            accessibilityLabel="Emergency contact relationship to player"
            placeholder="For example, parent or grandparent"
            placeholderTextColor={palette.muted}
            value={emergencyRelation}
            onChangeText={onEmergencyRelationChange}
            autoCapitalize="words"
            maxLength={100}
          />
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: palette.border }]} />

      <View style={styles.section}>
        <View style={styles.sectionHeading}>
          <ThemedText type="defaultSemiBold">Backup contact</ThemedText>
          <ThemedText style={[styles.hint, { color: palette.muted }]}>Optional</ThemedText>
        </View>

        <View style={styles.field}>
          <ThemedText style={styles.label}>Full name</ThemedText>
          <TextInput
            style={inputStyle}
            accessibilityLabel="Backup contact full name, optional"
            placeholder="Contact name"
            placeholderTextColor={palette.muted}
            value={secondaryName}
            onChangeText={onSecondaryNameChange}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            maxLength={50}
          />
        </View>

        <View style={styles.field}>
          <ThemedText style={styles.label}>Phone number</ThemedText>
          <TextInput
            style={inputStyle}
            accessibilityLabel="Backup contact phone number, optional"
            placeholder="07700 900456"
            placeholderTextColor={palette.muted}
            value={secondaryPhone}
            onChangeText={onSecondaryPhoneChange}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            maxLength={20}
          />
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: palette.border }]} />

      <Row align="center" style={styles.settingRow}>
        <View style={styles.settingCopy}>
          <ThemedText type="defaultSemiBold">Emergency treatment</ThemedText>
          <ThemedText style={[styles.hint, { color: palette.muted }]}>
            Allow urgent treatment when a guardian cannot be reached.
          </ThemedText>
        </View>
        <Switch
          value={emergencyTreatmentConsent}
          onValueChange={onEmergencyTreatmentConsentChange}
          accessibilityLabel="Emergency treatment consent"
          trackColor={{ false: palette.border, true: palette.tint }}
          thumbColor={palette.onPrimary}
          ios_backgroundColor={palette.border}
        />
      </Row>

      <View style={[styles.divider, { backgroundColor: palette.border }]} />

      <View style={styles.section}>
        <View style={styles.sectionHeading}>
          <ThemedText type="defaultSemiBold">Coach medical notes</ThemedText>
          <ThemedText style={[styles.hint, { color: palette.muted }]}>
            Include only what an assigned coach needs for a session.
          </ThemedText>
        </View>

        <View style={styles.field}>
          <ThemedText style={styles.label}>
            Does an assigned coach need medical, allergy or medication details for{' '}
            {firstName || 'this player'}? *
          </ThemedText>
          <Row style={styles.yesNoRow}>
            <Clickable
              onPress={() => onHasMedicalDetailsChange(true)}
              accessibilityRole="radio"
              accessibilityLabel="Yes, a coach needs medical details"
              accessibilityState={{
                selected: hasMedicalDetails === true,
                checked: hasMedicalDetails === true,
              }}
              style={[
                styles.yesNoButton,
                {
                  backgroundColor: hasMedicalDetails === true ? palette.tint : palette.surface,
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
              accessibilityRole="radio"
              accessibilityLabel="No medical details are needed"
              accessibilityState={{
                selected: hasMedicalDetails === false,
                checked: hasMedicalDetails === false,
              }}
              style={[
                styles.yesNoButton,
                {
                  backgroundColor: hasMedicalDetails === false ? palette.tint : palette.surface,
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
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stepContent: {
    gap: Spacing.lg,
  },
  context: {
    ...Typography.small,
    lineHeight: 18,
  },
  section: {
    gap: Spacing.md,
  },
  sectionHeading: {
    gap: Spacing.xxs,
  },
  hint: {
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
    minHeight: 48,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    ...Typography.body,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  settingRow: {
    gap: Spacing.md,
    justifyContent: 'space-between',
  },
  settingCopy: {
    flex: 1,
    gap: Spacing.xxs,
  },
  yesNoRow: {
    gap: Spacing.xs,
  },
  yesNoButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: Radii.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yesNoText: {
    ...Typography.bodySemiBold,
  },
});

export const AddChildEmergencyStep = AddChildEmergencyStepInner;
export default AddChildEmergencyStep;
