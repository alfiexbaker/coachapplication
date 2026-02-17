import React from 'react';

import { useTheme } from '@/hooks/useTheme';
import { type Disability, type SpecialNeed } from '@/services/child-service';
import { SpecialNeedsForm } from './medical-special-needs-form';
import { MedicalTagListForm } from './medical-tag-list-form';

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
  // Disability detail fields
  diagnosisDate: string;
  supportRequired: string;
  commPrefs: string[];
  triggers: string[];
  calmingStrategies: string[];
  // Special need form fields
  specialNeeds: SpecialNeed[];
  snCategory: SpecialNeed['category'] | null;
  snName: string;
  snDescription: string;
  snSeverity: SpecialNeed['severity'] | undefined;
  snAccommodations: string[];
  snParentHints: string;
  // Callbacks
  onHasSpecialNeedsChange: (value: boolean) => void;
  onDisabilitiesChange: (value: Disability[]) => void;
  onSelectedDisabilityTypeChange: (value: string | null) => void;
  onDisabilityDescriptionChange: (value: string) => void;
  onCommunicationNotesChange: (value: string) => void;
  onBehavioralNotesChange: (value: string) => void;
  onAddDisability: () => void;
  onDiagnosisDateChange: (value: string) => void;
  onSupportRequiredChange: (value: string) => void;
  onCommPrefsChange: (value: string[]) => void;
  onTriggersChange: (value: string[]) => void;
  onCalmingStrategiesChange: (value: string[]) => void;
  onSnCategoryChange: (v: SpecialNeed['category']) => void;
  onSnNameChange: (v: string) => void;
  onSnDescriptionChange: (v: string) => void;
  onSnSeverityChange: (v: SpecialNeed['severity']) => void;
  onSnAccommodationsChange: (v: string[]) => void;
  onSnParentHintsChange: (v: string) => void;
  onAddSpecialNeed: () => void;
  onRemoveSpecialNeed: (id: string) => void;
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
    return (
      <SpecialNeedsForm
        firstName={props.firstName}
        hasSpecialNeeds={props.hasSpecialNeeds}
        disabilities={props.disabilities}
        selectedDisabilityType={props.selectedDisabilityType}
        disabilityDescription={props.disabilityDescription}
        communicationNotes={props.communicationNotes}
        behavioralNotes={props.behavioralNotes}
        diagnosisDate={props.diagnosisDate}
        supportRequired={props.supportRequired}
        commPrefs={props.commPrefs}
        triggers={props.triggers}
        calmingStrategies={props.calmingStrategies}
        specialNeeds={props.specialNeeds}
        snCategory={props.snCategory}
        snName={props.snName}
        snDescription={props.snDescription}
        snSeverity={props.snSeverity}
        snAccommodations={props.snAccommodations}
        snParentHints={props.snParentHints}
        onHasSpecialNeedsChange={props.onHasSpecialNeedsChange}
        onDisabilitiesChange={props.onDisabilitiesChange}
        onSelectedDisabilityTypeChange={props.onSelectedDisabilityTypeChange}
        onDisabilityDescriptionChange={props.onDisabilityDescriptionChange}
        onCommunicationNotesChange={props.onCommunicationNotesChange}
        onBehavioralNotesChange={props.onBehavioralNotesChange}
        onAddDisability={props.onAddDisability}
        onDiagnosisDateChange={props.onDiagnosisDateChange}
        onSupportRequiredChange={props.onSupportRequiredChange}
        onCommPrefsChange={props.onCommPrefsChange}
        onTriggersChange={props.onTriggersChange}
        onCalmingStrategiesChange={props.onCalmingStrategiesChange}
        onSnCategoryChange={props.onSnCategoryChange}
        onSnNameChange={props.onSnNameChange}
        onSnDescriptionChange={props.onSnDescriptionChange}
        onSnSeverityChange={props.onSnSeverityChange}
        onSnAccommodationsChange={props.onSnAccommodationsChange}
        onSnParentHintsChange={props.onSnParentHintsChange}
        onAddSpecialNeed={props.onAddSpecialNeed}
        onRemoveSpecialNeed={props.onRemoveSpecialNeed}
        palette={palette}
      />
    );
  }

  return (
    <MedicalTagListForm
      allergies={props.allergies}
      allergyInput={props.allergyInput}
      medicalConditions={props.medicalConditions}
      conditionInput={props.conditionInput}
      medications={props.medications}
      medicationInput={props.medicationInput}
      onAllergiesChange={props.onAllergiesChange}
      onAllergyInputChange={props.onAllergyInputChange}
      onAddAllergy={props.onAddAllergy}
      onMedicalConditionsChange={props.onMedicalConditionsChange}
      onConditionInputChange={props.onConditionInputChange}
      onAddCondition={props.onAddCondition}
      onMedicationsChange={props.onMedicationsChange}
      onMedicationInputChange={props.onMedicationInputChange}
      onAddMedication={props.onAddMedication}
      palette={palette}
    />
  );
}

// ─── Exports ────────────────────────────────────────────────────

export const AddChildMedicalStep = React.memo(AddChildMedicalStepInner);
export default AddChildMedicalStep;
