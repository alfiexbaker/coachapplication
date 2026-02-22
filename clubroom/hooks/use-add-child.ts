/**
 * Hook for the Add Child wizard.
 * Manages all step state, validation, navigation, and save.
 */

import { useState, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { toDateStr } from '@/utils/format';
import { useAuth } from '@/hooks/use-auth';
import type { PositionRole } from '@/types/progress-types';
import {
  childService,
  type Gender,
  type Relationship,
  type Disability,
  type SpecialNeed,
} from '@/services/child-service';

export type Step = 'basic' | 'special_needs' | 'medical' | 'emergency' | 'consents';

export const STEPS: Step[] = ['basic', 'special_needs', 'medical', 'emergency', 'consents'];

export const STEP_TITLES: Record<Step, string> = {
  basic: 'Basic Information',
  special_needs: 'Special Needs & Disabilities',
  medical: 'Medical Information',
  emergency: 'Emergency Contacts',
  consents: 'Permissions & Consents',
};

export function useAddChild() {
  const { currentUser } = useAuth();

  const [currentStep, setCurrentStep] = useState<Step>('basic');
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Step 1: Basic Info
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [gender, setGender] = useState<Gender | null>(null);
  const [relationship, setRelationship] = useState<Relationship | null>(null);
  const [primaryPosition, setPrimaryPosition] = useState<PositionRole | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  // Step 2: Special Needs
  const [hasSpecialNeeds, setHasSpecialNeeds] = useState<boolean | null>(null);
  const [disabilities, setDisabilities] = useState<Disability[]>([]);
  const [specialNeeds, setSpecialNeeds] = useState<SpecialNeed[]>([]);
  const [selectedDisabilityType, setSelectedDisabilityType] = useState<string | null>(null);
  const [disabilityDescription, setDisabilityDescription] = useState('');
  const [communicationNotes, setCommunicationNotes] = useState('');
  const [behavioralNotes, setBehavioralNotes] = useState('');

  // Disability detail fields (collected in expanded panel)
  const [diagnosisDate, setDiagnosisDate] = useState('');
  const [supportRequired, setSupportRequired] = useState('');
  const [commPrefs, setCommPrefs] = useState<string[]>([]);
  const [triggers, setTriggers] = useState<string[]>([]);
  const [calmingStrategies, setCalmingStrategies] = useState<string[]>([]);

  // SpecialNeed form fields
  const [snCategory, setSnCategory] = useState<SpecialNeed['category'] | null>(null);
  const [snName, setSnName] = useState('');
  const [snDescription, setSnDescription] = useState('');
  const [snSeverity, setSnSeverity] = useState<SpecialNeed['severity'] | undefined>(undefined);
  const [snAccommodations, setSnAccommodations] = useState<string[]>([]);
  const [snParentHints, setSnParentHints] = useState('');

  // Step 3: Medical
  const [allergies, setAllergies] = useState<string[]>([]);
  const [allergyInput, setAllergyInput] = useState('');
  const [medicalConditions, setMedicalConditions] = useState<string[]>([]);
  const [conditionInput, setConditionInput] = useState('');
  const [medications, setMedications] = useState<string[]>([]);
  const [medicationInput, setMedicationInput] = useState('');

  // Step 4: Emergency
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('');
  const [secondaryName, setSecondaryName] = useState('');
  const [secondaryPhone, setSecondaryPhone] = useState('');

  // Step 5: Consents
  const [photoConsent, setPhotoConsent] = useState(true);
  const [videoConsent, setVideoConsent] = useState(true);
  const [socialMediaConsent, setSocialMediaConsent] = useState(false);
  const [emergencyTreatmentConsent, setEmergencyTreatmentConsent] = useState(true);

  const stepIndex = STEPS.indexOf(currentStep);
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === STEPS.length - 1;

  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
  }, []);

  const addAllergy = useCallback(() => {
    if (allergyInput.trim()) {
      setAllergies((p) => [...p, allergyInput.trim()]);
      setAllergyInput('');
    }
  }, [allergyInput]);
  const addCondition = useCallback(() => {
    if (conditionInput.trim()) {
      setMedicalConditions((p) => [...p, conditionInput.trim()]);
      setConditionInput('');
    }
  }, [conditionInput]);
  const addMedication = useCallback(() => {
    if (medicationInput.trim()) {
      setMedications((p) => [...p, medicationInput.trim()]);
      setMedicationInput('');
    }
  }, [medicationInput]);

  const addDisability = useCallback(() => {
    if (selectedDisabilityType) {
      setDisabilities((p) => [
        ...p,
        {
          id: `dis-${Date.now()}`,
          type: selectedDisabilityType,
          description: disabilityDescription || undefined,
          diagnosisDate: diagnosisDate || undefined,
          supportRequired: supportRequired || undefined,
          communicationPreferences: commPrefs.length > 0 ? commPrefs : undefined,
          triggers: triggers.length > 0 ? triggers : undefined,
          calmingStrategies: calmingStrategies.length > 0 ? calmingStrategies : undefined,
        },
      ]);
      setSelectedDisabilityType(null);
      setDisabilityDescription('');
      setDiagnosisDate('');
      setSupportRequired('');
      setCommPrefs([]);
      setTriggers([]);
      setCalmingStrategies([]);
    }
  }, [
    selectedDisabilityType,
    disabilityDescription,
    diagnosisDate,
    supportRequired,
    commPrefs,
    triggers,
    calmingStrategies,
  ]);

  const addSpecialNeed = useCallback(() => {
    if (snCategory && snName.trim()) {
      setSpecialNeeds((p) => [
        ...p,
        {
          id: `sn-${Date.now()}`,
          category: snCategory,
          name: snName.trim(),
          description: snDescription.trim() || undefined,
          severity: snSeverity,
          accommodationsNeeded: snAccommodations.length > 0 ? snAccommodations : undefined,
          parentHints: snParentHints.trim() || undefined,
        },
      ]);
      setSnCategory(null);
      setSnName('');
      setSnDescription('');
      setSnSeverity(undefined);
      setSnAccommodations([]);
      setSnParentHints('');
    }
  }, [snCategory, snName, snDescription, snSeverity, snAccommodations, snParentHints]);

  const removeSpecialNeed = useCallback((id: string) => {
    setSpecialNeeds((p) => p.filter((sn) => sn.id !== id));
  }, []);

  const validateStep = useCallback((): boolean => {
    switch (currentStep) {
      case 'basic':
        if (!firstName.trim() || !lastName.trim() || !gender || !relationship) {
          Alert.alert('Required Fields', 'Please fill in name, gender, and relationship');
          return false;
        }
        return true;
      case 'special_needs':
        if (hasSpecialNeeds === null) {
          Alert.alert(
            'Required',
            'Please indicate if your child has any special needs or disabilities',
          );
          return false;
        }
        return true;
      case 'emergency':
        if (!emergencyName.trim() || !emergencyPhone.trim() || !emergencyRelation.trim()) {
          Alert.alert('Required Fields', 'Please provide at least one emergency contact');
          return false;
        }
        return true;
      default:
        return true;
    }
  }, [
    currentStep,
    firstName,
    lastName,
    gender,
    relationship,
    hasSpecialNeeds,
    emergencyName,
    emergencyPhone,
    emergencyRelation,
  ]);

  const goNext = useCallback(() => {
    if (validateStep() && !isLastStep) setCurrentStep(STEPS[stepIndex + 1]);
  }, [validateStep, isLastStep, stepIndex]);
  const goBack = useCallback(() => {
    if (!isFirstStep) setCurrentStep(STEPS[stepIndex - 1]);
    else router.back();
  }, [isFirstStep, stepIndex]);

  const handleSave = useCallback(async () => {
    if (!validateStep() || !currentUser?.id) return;
    setSaving(true);
    try {
      const createdChild = await childService.createChild(currentUser.id, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        nickname: nickname.trim() || undefined,
        dateOfBirth: dateOfBirth ? toDateStr(dateOfBirth) : undefined,
        gender: gender!,
        relationship: relationship!,
        primaryPosition: primaryPosition ?? undefined,
        photoUrl: photoUri || undefined,
        disabilities,
        specialNeeds,
        allergies,
        medicalConditions,
        medications,
        communicationNotes: communicationNotes.trim() || undefined,
        behavioralNotes: behavioralNotes.trim() || undefined,
        emergencyContactName: emergencyName.trim(),
        emergencyContactPhone: emergencyPhone.trim(),
        emergencyContactRelation: emergencyRelation.trim(),
        secondaryEmergencyName: secondaryName.trim() || undefined,
        secondaryEmergencyPhone: secondaryPhone.trim() || undefined,
        photoConsent,
        videoConsent,
        socialMediaConsent,
        emergencyTreatmentConsent,
      });

      // Make the newly added child immediately visible as current context.
      await childService.setActiveChildId(
        createdChild.id,
        createdChild.nickname || createdChild.firstName,
      );

      Alert.alert('Success', `${firstName}'s profile has been created!`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to create child profile. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [
    validateStep,
    currentUser,
    firstName,
    lastName,
    nickname,
    dateOfBirth,
    gender,
    relationship,
    primaryPosition,
    photoUri,
    disabilities,
    specialNeeds,
    allergies,
    medicalConditions,
    medications,
    communicationNotes,
    behavioralNotes,
    emergencyName,
    emergencyPhone,
    emergencyRelation,
    secondaryName,
    secondaryPhone,
    photoConsent,
    videoConsent,
    socialMediaConsent,
    emergencyTreatmentConsent,
  ]);

  // Pre-built props for step components
  const basicProps = useMemo(
    () => ({
      firstName,
      lastName,
      nickname,
      dateOfBirth,
      gender,
      relationship,
      primaryPosition,
      photoUri,
      showDatePicker,
      onFirstNameChange: setFirstName,
      onLastNameChange: setLastName,
      onNicknameChange: setNickname,
      onDateOfBirthChange: setDateOfBirth,
      onGenderChange: setGender,
      onRelationshipChange: setRelationship,
      onPrimaryPositionChange: setPrimaryPosition,
      onPickImage: pickImage,
      onShowDatePicker: setShowDatePicker,
    }),
    [
      firstName,
      lastName,
      nickname,
      dateOfBirth,
      gender,
      relationship,
      primaryPosition,
      photoUri,
      showDatePicker,
      pickImage,
    ],
  );

  const medicalProps = useMemo(
    () => ({
      firstName,
      hasSpecialNeeds,
      disabilities,
      specialNeeds,
      selectedDisabilityType,
      disabilityDescription,
      communicationNotes,
      behavioralNotes,
      // Disability detail fields
      diagnosisDate,
      supportRequired,
      commPrefs,
      triggers,
      calmingStrategies,
      // SpecialNeed form fields
      snCategory,
      snName,
      snDescription,
      snSeverity,
      snAccommodations,
      snParentHints,
      // Callbacks
      onHasSpecialNeedsChange: setHasSpecialNeeds,
      onDisabilitiesChange: setDisabilities,
      onSelectedDisabilityTypeChange: setSelectedDisabilityType,
      onDisabilityDescriptionChange: setDisabilityDescription,
      onCommunicationNotesChange: setCommunicationNotes,
      onBehavioralNotesChange: setBehavioralNotes,
      onAddDisability: addDisability,
      onDiagnosisDateChange: setDiagnosisDate,
      onSupportRequiredChange: setSupportRequired,
      onCommPrefsChange: setCommPrefs,
      onTriggersChange: setTriggers,
      onCalmingStrategiesChange: setCalmingStrategies,
      onSnCategoryChange: setSnCategory,
      onSnNameChange: setSnName,
      onSnDescriptionChange: setSnDescription,
      onSnSeverityChange: setSnSeverity,
      onSnAccommodationsChange: setSnAccommodations,
      onSnParentHintsChange: setSnParentHints,
      onAddSpecialNeed: addSpecialNeed,
      onRemoveSpecialNeed: removeSpecialNeed,
      // Medical fields
      allergies,
      allergyInput,
      medicalConditions,
      conditionInput,
      medications,
      medicationInput,
      onAllergiesChange: setAllergies,
      onAllergyInputChange: setAllergyInput,
      onAddAllergy: addAllergy,
      onMedicalConditionsChange: setMedicalConditions,
      onConditionInputChange: setConditionInput,
      onAddCondition: addCondition,
      onMedicationsChange: setMedications,
      onMedicationInputChange: setMedicationInput,
      onAddMedication: addMedication,
    }),
    [
      firstName,
      hasSpecialNeeds,
      disabilities,
      specialNeeds,
      selectedDisabilityType,
      disabilityDescription,
      communicationNotes,
      behavioralNotes,
      diagnosisDate,
      supportRequired,
      commPrefs,
      triggers,
      calmingStrategies,
      snCategory,
      snName,
      snDescription,
      snSeverity,
      snAccommodations,
      snParentHints,
      allergies,
      allergyInput,
      medicalConditions,
      conditionInput,
      medications,
      medicationInput,
      addDisability,
      addSpecialNeed,
      removeSpecialNeed,
      addAllergy,
      addCondition,
      addMedication,
    ],
  );

  const emergencyProps = useMemo(
    () => ({
      emergencyName,
      emergencyPhone,
      emergencyRelation,
      secondaryName,
      secondaryPhone,
      onEmergencyNameChange: setEmergencyName,
      onEmergencyPhoneChange: setEmergencyPhone,
      onEmergencyRelationChange: setEmergencyRelation,
      onSecondaryNameChange: setSecondaryName,
      onSecondaryPhoneChange: setSecondaryPhone,
    }),
    [emergencyName, emergencyPhone, emergencyRelation, secondaryName, secondaryPhone],
  );

  const consentsProps = useMemo(
    () => ({
      photoConsent,
      videoConsent,
      socialMediaConsent,
      emergencyTreatmentConsent,
      onPhotoConsentChange: setPhotoConsent,
      onVideoConsentChange: setVideoConsent,
      onSocialMediaConsentChange: setSocialMediaConsent,
      onEmergencyTreatmentConsentChange: setEmergencyTreatmentConsent,
    }),
    [photoConsent, videoConsent, socialMediaConsent, emergencyTreatmentConsent],
  );

  return {
    currentStep,
    stepIndex,
    isFirstStep,
    isLastStep,
    saving,
    firstName,
    goNext,
    goBack,
    handleSave,
    basicProps,
    medicalProps,
    emergencyProps,
    consentsProps,
  };
}
