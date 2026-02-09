import React from 'react';

import { useTheme } from '@/hooks/useTheme';
import { type Disability } from '@/services/child-service';
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
    return (
      <SpecialNeedsForm
        firstName={props.firstName}
        hasSpecialNeeds={props.hasSpecialNeeds}
        disabilities={props.disabilities}
        selectedDisabilityType={props.selectedDisabilityType}
        disabilityDescription={props.disabilityDescription}
        communicationNotes={props.communicationNotes}
        behavioralNotes={props.behavioralNotes}
        onHasSpecialNeedsChange={props.onHasSpecialNeedsChange}
        onDisabilitiesChange={props.onDisabilitiesChange}
        onSelectedDisabilityTypeChange={props.onSelectedDisabilityTypeChange}
        onDisabilityDescriptionChange={props.onDisabilityDescriptionChange}
        onCommunicationNotesChange={props.onCommunicationNotesChange}
        onBehavioralNotesChange={props.onBehavioralNotesChange}
        onAddDisability={props.onAddDisability}
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
