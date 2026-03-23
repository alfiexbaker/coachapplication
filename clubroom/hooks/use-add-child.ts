/**
 * Hook for the Add Child wizard.
 * Manages a condensed 3-step flow: child details, conditional support, and safety essentials.
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';

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
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { uiFeedback } from '@/services/ui-feedback';

export type Step = 'basic' | 'special_needs' | 'safety';

export const STEPS: Step[] = ['basic', 'special_needs', 'safety'];

export const STEP_TITLES: Record<Step, string> = {
  basic: 'Child Details',
  special_needs: 'Support Needs',
  safety: 'Safety Essentials',
};

const ADD_CHILD_DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function normalizeDraftStep(step: string | undefined): Step {
  if (step === 'special_needs') return 'special_needs';
  if (step === 'safety' || step === 'medical' || step === 'emergency' || step === 'consents') {
    return 'safety';
  }
  return 'basic';
}

type AddChildDraft = {
  version: 1;
  timestamp: number;
  currentStep: Step;
  firstName: string;
  lastName: string;
  nickname: string;
  dateOfBirth: string | null;
  gender: Gender | null;
  relationship: Relationship | null;
  primaryPosition: PositionRole | null;
  photoUri: string | null;
  hasSpecialNeeds: boolean | null;
  disabilities: Disability[];
  specialNeeds: SpecialNeed[];
  selectedDisabilityType: string | null;
  disabilityDescription: string;
  communicationNotes: string;
  behavioralNotes: string;
  diagnosisDate: string;
  supportRequired: string;
  commPrefs: string[];
  triggers: string[];
  calmingStrategies: string[];
  hasMedicalDetails: boolean | null;
  snCategory: SpecialNeed['category'] | null;
  snName: string;
  snDescription: string;
  snSeverity: SpecialNeed['severity'] | undefined;
  snAccommodations: string[];
  snParentHints: string;
  allergies: string[];
  allergyInput: string;
  medicalConditions: string[];
  conditionInput: string;
  medications: string[];
  medicationInput: string;
  emergencyName: string;
  emergencyPhone: string;
  emergencyRelation: string;
  secondaryName: string;
  secondaryPhone: string;
  photoConsent: boolean;
  videoConsent: boolean;
  socialMediaConsent: boolean;
  emergencyTreatmentConsent: boolean;
};

export function useAddChild() {
  const { currentUser } = useAuth();

  const [currentStep, setCurrentStep] = useState<Step>('basic');
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  // Step 1: Child details
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [gender, setGender] = useState<Gender | null>(null);
  const [relationship, setRelationship] = useState<Relationship | null>(null);
  const [primaryPosition, setPrimaryPosition] = useState<PositionRole | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  // Step 2: Conditional support profile
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

  // Step 3: Safety essentials
  const [hasMedicalDetails, setHasMedicalDetails] = useState<boolean | null>(null);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [allergyInput, setAllergyInput] = useState('');
  const [medicalConditions, setMedicalConditions] = useState<string[]>([]);
  const [conditionInput, setConditionInput] = useState('');
  const [medications, setMedications] = useState<string[]>([]);
  const [medicationInput, setMedicationInput] = useState('');

  // Safety contact details
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('');
  const [secondaryName, setSecondaryName] = useState('');
  const [secondaryPhone, setSecondaryPhone] = useState('');

  // Stored defaults for downstream safeguarding/media flows.
  const [photoConsent, setPhotoConsent] = useState(true);
  const [videoConsent, setVideoConsent] = useState(true);
  const [socialMediaConsent, setSocialMediaConsent] = useState(false);
  const [emergencyTreatmentConsent, setEmergencyTreatmentConsent] = useState(true);
  const hydratingDraftRef = useRef(false);
  const initializedDraftRef = useRef(false);
  const draftCheckCompleteRef = useRef(false);

  const stepIndex = STEPS.indexOf(currentStep);
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === STEPS.length - 1;
  const clearValidationMessage = useCallback(() => {
    setValidationMessage(null);
  }, []);

  const buildDraft = useCallback(
    (): AddChildDraft => ({
      version: 1,
      timestamp: Date.now(),
      currentStep,
      firstName,
      lastName,
      nickname,
      dateOfBirth: dateOfBirth ? dateOfBirth.toISOString() : null,
      gender,
      relationship,
      primaryPosition,
      photoUri,
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
      hasMedicalDetails,
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
      emergencyName,
      emergencyPhone,
      emergencyRelation,
      secondaryName,
      secondaryPhone,
      photoConsent,
      videoConsent,
      socialMediaConsent,
      emergencyTreatmentConsent,
    }),
    [
      currentStep,
      firstName,
      lastName,
      nickname,
      dateOfBirth,
      gender,
      relationship,
      primaryPosition,
      photoUri,
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
      hasMedicalDetails,
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
      emergencyName,
      emergencyPhone,
      emergencyRelation,
      secondaryName,
      secondaryPhone,
      photoConsent,
      videoConsent,
      socialMediaConsent,
      emergencyTreatmentConsent,
    ],
  );

  const applyDraft = useCallback((draft: AddChildDraft) => {
    hydratingDraftRef.current = true;
    setCurrentStep(normalizeDraftStep(draft.currentStep));
    setFirstName(draft.firstName);
    setLastName(draft.lastName);
    setNickname(draft.nickname);
    setDateOfBirth(draft.dateOfBirth ? new Date(draft.dateOfBirth) : null);
    setGender(draft.gender);
    setRelationship(draft.relationship);
    setPrimaryPosition(draft.primaryPosition);
    setPhotoUri(draft.photoUri);
    setHasSpecialNeeds(draft.hasSpecialNeeds);
    setDisabilities(draft.disabilities);
    setSpecialNeeds(draft.specialNeeds);
    setSelectedDisabilityType(draft.selectedDisabilityType);
    setDisabilityDescription(draft.disabilityDescription);
    setCommunicationNotes(draft.communicationNotes);
    setBehavioralNotes(draft.behavioralNotes);
    setDiagnosisDate(draft.diagnosisDate);
    setSupportRequired(draft.supportRequired);
    setCommPrefs(draft.commPrefs);
    setTriggers(draft.triggers);
    setCalmingStrategies(draft.calmingStrategies);
    setHasMedicalDetails(
      draft.hasMedicalDetails ??
        (draft.allergies.length > 0 ||
        draft.medicalConditions.length > 0 ||
        draft.medications.length > 0
          ? true
          : null),
    );
    setSnCategory(draft.snCategory);
    setSnName(draft.snName);
    setSnDescription(draft.snDescription);
    setSnSeverity(draft.snSeverity);
    setSnAccommodations(draft.snAccommodations);
    setSnParentHints(draft.snParentHints);
    setAllergies(draft.allergies);
    setAllergyInput(draft.allergyInput);
    setMedicalConditions(draft.medicalConditions);
    setConditionInput(draft.conditionInput);
    setMedications(draft.medications);
    setMedicationInput(draft.medicationInput);
    setEmergencyName(draft.emergencyName);
    setEmergencyPhone(draft.emergencyPhone);
    setEmergencyRelation(draft.emergencyRelation);
    setSecondaryName(draft.secondaryName);
    setSecondaryPhone(draft.secondaryPhone);
    setPhotoConsent(draft.photoConsent);
    setVideoConsent(draft.videoConsent);
    setSocialMediaConsent(draft.socialMediaConsent);
    setEmergencyTreatmentConsent(draft.emergencyTreatmentConsent);
    setTimeout(() => {
      hydratingDraftRef.current = false;
    }, 0);
  }, []);

  const clearDraft = useCallback(async () => {
    await apiClient.remove(STORAGE_KEYS.ADD_CHILD_DRAFT);
  }, []);

  useEffect(() => {
    if (initializedDraftRef.current) return;
    initializedDraftRef.current = true;

    let active = true;
    const loadDraft = async () => {
      const draft = await apiClient.get<AddChildDraft | null>(STORAGE_KEYS.ADD_CHILD_DRAFT, null);
      if (!active) return;
      if (!draft) {
        draftCheckCompleteRef.current = true;
        return;
      }

      const ageMs = Date.now() - draft.timestamp;
      if (ageMs > ADD_CHILD_DRAFT_MAX_AGE_MS) {
        await clearDraft();
        draftCheckCompleteRef.current = true;
        return;
      }

      uiFeedback.alert(
        'Resume draft?',
        'You have an unfinished child registration. Continue where you left off?',
        [
          {
            text: 'Start Fresh',
            style: 'destructive',
            onPress: () => {
              void clearDraft();
              draftCheckCompleteRef.current = true;
            },
          },
          {
            text: 'Resume',
            onPress: () => {
              applyDraft(draft);
              draftCheckCompleteRef.current = true;
            },
          },
        ],
      );
    };

    void loadDraft().catch(() => {
      if (active) draftCheckCompleteRef.current = true;
    });
    return () => {
      active = false;
    };
  }, [applyDraft, clearDraft]);

  const draftPayload = useMemo(() => buildDraft(), [buildDraft]);
  const hasDraftContent = useMemo(
    () =>
      Boolean(
        firstName.trim() ||
          lastName.trim() ||
          nickname.trim() ||
          dateOfBirth ||
          gender ||
          relationship ||
          photoUri ||
          hasSpecialNeeds !== null ||
          disabilities.length ||
          specialNeeds.length ||
          communicationNotes.trim() ||
          behavioralNotes.trim() ||
          hasMedicalDetails !== null ||
          allergyInput.trim() ||
          allergies.length ||
          conditionInput.trim() ||
          medicalConditions.length ||
          medicationInput.trim() ||
          medications.length ||
          emergencyName.trim() ||
          emergencyPhone.trim() ||
          emergencyRelation.trim() ||
          secondaryName.trim() ||
          secondaryPhone.trim(),
      ),
    [
      firstName,
      lastName,
      nickname,
      dateOfBirth,
      gender,
      relationship,
      photoUri,
      hasSpecialNeeds,
      disabilities.length,
      specialNeeds.length,
      communicationNotes,
      behavioralNotes,
      hasMedicalDetails,
      allergyInput,
      allergies.length,
      conditionInput,
      medicalConditions.length,
      medicationInput,
      medications.length,
      emergencyName,
      emergencyPhone,
      emergencyRelation,
      secondaryName,
      secondaryPhone,
    ],
  );

  useEffect(() => {
    if (!draftCheckCompleteRef.current) return;
    if (hydratingDraftRef.current) return;

    const timeout = setTimeout(() => {
      if (hasDraftContent) {
        void apiClient.set(STORAGE_KEYS.ADD_CHILD_DRAFT, draftPayload);
      } else {
        void clearDraft();
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [draftPayload, hasDraftContent, clearDraft]);

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

  const handleSpecialNeedsChange = useCallback((value: boolean) => {
    setHasSpecialNeeds(value);
    if (value) {
      return;
    }

    setDisabilities([]);
    setSpecialNeeds([]);
    setSelectedDisabilityType(null);
    setDisabilityDescription('');
    setCommunicationNotes('');
    setBehavioralNotes('');
    setDiagnosisDate('');
    setSupportRequired('');
    setCommPrefs([]);
    setTriggers([]);
    setCalmingStrategies([]);
    setSnCategory(null);
    setSnName('');
    setSnDescription('');
    setSnSeverity(undefined);
    setSnAccommodations([]);
    setSnParentHints('');
  }, []);

  const handleMedicalDetailsChange = useCallback((value: boolean) => {
    setHasMedicalDetails(value);
    if (value) {
      return;
    }

    setAllergies([]);
    setAllergyInput('');
    setMedicalConditions([]);
    setConditionInput('');
    setMedications([]);
    setMedicationInput('');
  }, []);

  const resolvedAllergies = useMemo(
    () =>
      allergyInput.trim() && !allergies.includes(allergyInput.trim())
        ? [...allergies, allergyInput.trim()]
        : allergies,
    [allergies, allergyInput],
  );
  const resolvedMedicalConditions = useMemo(
    () =>
      conditionInput.trim() && !medicalConditions.includes(conditionInput.trim())
        ? [...medicalConditions, conditionInput.trim()]
        : medicalConditions,
    [medicalConditions, conditionInput],
  );
  const resolvedMedications = useMemo(
    () =>
      medicationInput.trim() && !medications.includes(medicationInput.trim())
        ? [...medications, medicationInput.trim()]
        : medications,
    [medications, medicationInput],
  );

  const validateStep = useCallback((): boolean => {
    switch (currentStep) {
      case 'basic': {
        const errors: string[] = [];
        if (!firstName.trim()) errors.push('First name is required');
        if (!lastName.trim()) errors.push('Last name is required');
        if (!gender) errors.push('Gender is required');
        if (!relationship) errors.push('Relationship is required');
        if (dateOfBirth) {
          const now = new Date();
          const age = now.getFullYear() - dateOfBirth.getFullYear();
          const adjustedAge =
            now < new Date(now.getFullYear(), dateOfBirth.getMonth(), dateOfBirth.getDate())
              ? age - 1
              : age;
          if (adjustedAge < 3 || adjustedAge > 18) {
            errors.push('Age must be between 3 and 18');
          }
        }
        if (errors.length > 0) {
          setValidationMessage(errors.join('\n'));
          return false;
        }
        setValidationMessage(null);
        return true;
      }
      case 'special_needs':
        if (hasSpecialNeeds === null) {
          setValidationMessage('Please indicate whether your child needs coaching adjustments.');
          return false;
        }
        setValidationMessage(null);
        return true;
      case 'safety': {
        const errors: string[] = [];
        if (!emergencyName.trim()) errors.push('Emergency contact name is required');
        if (!emergencyPhone.trim()) {
          errors.push('Emergency contact phone is required');
        } else {
          // UK phone validation: 07xxx xxxxxx or +44 7xxx xxxxxx
          const cleaned = emergencyPhone.replace(/\s/g, '');
          const ukPhoneRegex = /^(\+447\d{9}|07\d{9})$/;
          if (!ukPhoneRegex.test(cleaned)) {
            errors.push('Please enter a valid UK phone number (07xxx xxxxxx)');
          }
        }
        if (!emergencyRelation.trim()) errors.push('Emergency contact relationship is required');
        if (hasMedicalDetails === null) {
          errors.push('Please tell us whether coaches need any medical details for sessions');
        }
        if (
          hasMedicalDetails === true &&
          resolvedAllergies.length === 0 &&
          resolvedMedicalConditions.length === 0 &&
          resolvedMedications.length === 0
        ) {
          errors.push('Add at least one allergy, condition, or medication, or choose No');
        }
        // Validate secondary phone if provided
        if (secondaryPhone.trim()) {
          const cleaned = secondaryPhone.replace(/\s/g, '');
          const ukPhoneRegex = /^(\+447\d{9}|07\d{9})$/;
          if (!ukPhoneRegex.test(cleaned)) {
            errors.push('Secondary phone: Please enter a valid UK phone number');
          }
        }
        if (errors.length > 0) {
          setValidationMessage(errors.join('\n'));
          return false;
        }
        setValidationMessage(null);
        return true;
      }
      default:
        setValidationMessage(null);
        return true;
    }
  }, [
    currentStep,
    firstName,
    lastName,
    gender,
    relationship,
    dateOfBirth,
    hasSpecialNeeds,
    hasMedicalDetails,
    emergencyName,
    emergencyPhone,
    emergencyRelation,
    secondaryPhone,
    resolvedAllergies.length,
    resolvedMedicalConditions.length,
    resolvedMedications.length,
  ]);

  const goNext = useCallback(() => {
    if (validateStep() && !isLastStep) {
      clearValidationMessage();
      setCurrentStep(STEPS[stepIndex + 1]);
    }
  }, [validateStep, isLastStep, stepIndex, clearValidationMessage]);
  const goBack = useCallback(() => {
    clearValidationMessage();
    if (!isFirstStep) setCurrentStep(STEPS[stepIndex - 1]);
    else router.back();
  }, [clearValidationMessage, isFirstStep, stepIndex]);

  const handleSave = useCallback(async () => {
    if (!currentUser?.id) return;
    if (!validateStep()) return;
    clearValidationMessage();
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
        allergies: resolvedAllergies,
        medicalConditions: resolvedMedicalConditions,
        medications: resolvedMedications,
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
      await clearDraft();

      uiFeedback.showToast(`${firstName}'s profile has been created!`, 'success');
      router.back();
    } catch {
      uiFeedback.showToast('Failed to create child profile. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  }, [
    clearValidationMessage,
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
    resolvedAllergies,
    resolvedMedicalConditions,
    resolvedMedications,
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
    clearDraft,
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
      onHasSpecialNeedsChange: handleSpecialNeedsChange,
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
      handleSpecialNeedsChange,
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

  const safetyProps = useMemo(
    () => ({
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
      onEmergencyNameChange: setEmergencyName,
      onEmergencyPhoneChange: setEmergencyPhone,
      onEmergencyRelationChange: setEmergencyRelation,
      onSecondaryNameChange: setSecondaryName,
      onSecondaryPhoneChange: setSecondaryPhone,
      onHasMedicalDetailsChange: handleMedicalDetailsChange,
      onAllergiesChange: setAllergies,
      onAllergyInputChange: setAllergyInput,
      onAddAllergy: addAllergy,
      onMedicalConditionsChange: setMedicalConditions,
      onConditionInputChange: setConditionInput,
      onAddCondition: addCondition,
      onMedicationsChange: setMedications,
      onMedicationInputChange: setMedicationInput,
      onAddMedication: addMedication,
      onEmergencyTreatmentConsentChange: setEmergencyTreatmentConsent,
    }),
    [
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
      handleMedicalDetailsChange,
      addAllergy,
      addCondition,
      addMedication,
    ],
  );

  return {
    currentStep,
    stepIndex,
    isFirstStep,
    isLastStep,
    saving,
    validationMessage,
    firstName,
    goNext,
    goBack,
    handleSave,
    clearValidationMessage,
    basicProps,
    medicalProps,
    safetyProps,
  };
}
