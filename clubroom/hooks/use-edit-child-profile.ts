import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from 'react';

import { router, useLocalSearchParams } from 'expo-router';

import {
  childService,
  type ChildProfile,
  type CreateChildInput,
  type Gender,
  type Relationship,
} from '@/services/child-service';
import { useScreen } from '@/hooks/use-screen';
import { err, ok, serviceError, type ServiceError } from '@/types/result';
import type { PositionRole } from '@/types/progress-types';
import { uiFeedback } from '@/services/ui-feedback';

const GENDER_OPTIONS: Gender[] = ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'];
const RELATIONSHIP_OPTIONS: Relationship[] = ['SON', 'DAUGHTER', 'WARD', 'GRANDCHILD', 'OTHER'];

export function useEditChildProfile() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<Gender>('PREFER_NOT_TO_SAY');
  const [relationship, setRelationship] = useState<Relationship>('OTHER');
  const [primaryPosition, setPrimaryPosition] = useState<PositionRole | null>(null);

  const [allergies, setAllergies] = useState<string[]>([]);
  const [medicalConditions, setMedicalConditions] = useState<string[]>([]);
  const [medications, setMedications] = useState<string[]>([]);

  const [communicationNotes, setCommunicationNotes] = useState('');
  const [behavioralNotes, setBehavioralNotes] = useState('');

  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [emergencyContactRelation, setEmergencyContactRelation] = useState('');
  const [secondaryEmergencyName, setSecondaryEmergencyName] = useState('');
  const [secondaryEmergencyPhone, setSecondaryEmergencyPhone] = useState('');

  const [photoConsent, setPhotoConsent] = useState(true);
  const [videoConsent, setVideoConsent] = useState(true);
  const [socialMediaConsent, setSocialMediaConsent] = useState(false);
  const [emergencyTreatmentConsent, setEmergencyTreatmentConsent] = useState(true);

  const hydrate = useCallback((child: ChildProfile) => {
    if (initialized) {
      return;
    }
    setFirstName(child.firstName);
    setLastName(child.lastName);
    setNickname(child.nickname ?? '');
    setDateOfBirth(child.dateOfBirth ?? '');
    setGender(child.gender);
    setRelationship(child.relationship);
    setPrimaryPosition(child.primaryPosition ?? null);

    setAllergies(child.allergies);
    setMedicalConditions(child.medicalConditions);
    setMedications(child.medications);
    setCommunicationNotes(child.communicationNotes ?? '');
    setBehavioralNotes(child.behavioralNotes ?? '');

    setEmergencyContactName(child.emergencyContactName);
    setEmergencyContactPhone(child.emergencyContactPhone);
    setEmergencyContactRelation(child.emergencyContactRelation);
    setSecondaryEmergencyName(child.secondaryEmergencyName ?? '');
    setSecondaryEmergencyPhone(child.secondaryEmergencyPhone ?? '');

    setPhotoConsent(child.photoConsent);
    setVideoConsent(child.videoConsent);
    setSocialMediaConsent(child.socialMediaConsent);
    setEmergencyTreatmentConsent(child.emergencyTreatmentConsent);
    setInitialized(true);
  }, [initialized]);

  const load = useCallback(async () => {
    if (!childId) {
      return err(serviceError('VALIDATION', 'Missing child ID.'));
    }
    const child = await childService.getChild(childId);
    if (!child) {
      return err(serviceError('NOT_FOUND', 'Child not found.'));
    }
    hydrate(child);
    return ok(child);
  }, [childId, hydrate]);

  const { data: child, status, error, retry } = useScreen<ChildProfile>({
    load,
    deps: [childId],
    isEmpty: (value) => !value,
  });

  const validate = useCallback(() => {
    if (!firstName.trim() || !lastName.trim()) {
      uiFeedback.showToast('Please enter first and last name.', 'error');
      return false;
    }
    if (!emergencyContactName.trim() || !emergencyContactPhone.trim() || !emergencyContactRelation.trim()) {
      uiFeedback.showToast('Please complete the primary emergency contact.', 'error');
      return false;
    }
    return true;
  }, [firstName, lastName, emergencyContactName, emergencyContactPhone, emergencyContactRelation]);

  const addItem = useCallback(
    (setter: Dispatch<SetStateAction<string[]>>) => (value: string) => {
      const clean = value.trim();
      if (!clean) return;
      setter((prev) => (prev.includes(clean) ? prev : [...prev, clean]));
    },
    [],
  );

  const removeItem = useCallback(
    (setter: Dispatch<SetStateAction<string[]>>) => (index: number) => {
      setter((prev) => prev.filter((_, i) => i !== index));
    },
    [],
  );

  const handleSave = useCallback(async () => {
    if (!child || !validate()) {
      return;
    }
    setSaving(true);
    try {
      const updates: Partial<CreateChildInput> = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        nickname: nickname.trim() || undefined,
        dateOfBirth: dateOfBirth.trim() || undefined,
        gender,
        relationship,
        primaryPosition,
        allergies,
        medicalConditions,
        medications,
        communicationNotes: communicationNotes.trim() || undefined,
        behavioralNotes: behavioralNotes.trim() || undefined,
        emergencyContactName: emergencyContactName.trim(),
        emergencyContactPhone: emergencyContactPhone.trim(),
        emergencyContactRelation: emergencyContactRelation.trim(),
        secondaryEmergencyName: secondaryEmergencyName.trim() || undefined,
        secondaryEmergencyPhone: secondaryEmergencyPhone.trim() || undefined,
        photoConsent,
        videoConsent,
        socialMediaConsent,
        emergencyTreatmentConsent,
      };

      const result = await childService.updateChild(child.id, updates);
      if (!result.success) {
        uiFeedback.showToast('Failed to save profile. Please try again.', 'error');
        return;
      }
      uiFeedback.alert('Saved', 'Child profile updated.', [{ text: 'OK', onPress: () => router.back() }]);
    } finally {
      setSaving(false);
    }
  }, [
    child,
    validate,
    firstName,
    lastName,
    nickname,
    dateOfBirth,
    gender,
    relationship,
    primaryPosition,
    allergies,
    medicalConditions,
    medications,
    communicationNotes,
    behavioralNotes,
    emergencyContactName,
    emergencyContactPhone,
    emergencyContactRelation,
    secondaryEmergencyName,
    secondaryEmergencyPhone,
    photoConsent,
    videoConsent,
    socialMediaConsent,
    emergencyTreatmentConsent,
  ]);

  return useMemo(
    () => ({
      child,
      loading: status === 'loading',
      status,
      error: status === 'error' ? (error as ServiceError | null) : null,
      retry,
      saving,
      firstName,
      setFirstName,
      lastName,
      setLastName,
      nickname,
      setNickname,
      dateOfBirth,
      setDateOfBirth,
      gender,
      setGender,
      relationship,
      setRelationship,
      primaryPosition,
      setPrimaryPosition,
      genderOptions: GENDER_OPTIONS,
      relationshipOptions: RELATIONSHIP_OPTIONS,
      allergies,
      addAllergy: addItem(setAllergies),
      removeAllergy: removeItem(setAllergies),
      medicalConditions,
      addMedicalCondition: addItem(setMedicalConditions),
      removeMedicalCondition: removeItem(setMedicalConditions),
      medications,
      addMedication: addItem(setMedications),
      removeMedication: removeItem(setMedications),
      communicationNotes,
      setCommunicationNotes,
      behavioralNotes,
      setBehavioralNotes,
      emergencyContactName,
      setEmergencyContactName,
      emergencyContactPhone,
      setEmergencyContactPhone,
      emergencyContactRelation,
      setEmergencyContactRelation,
      secondaryEmergencyName,
      setSecondaryEmergencyName,
      secondaryEmergencyPhone,
      setSecondaryEmergencyPhone,
      photoConsent,
      setPhotoConsent,
      videoConsent,
      setVideoConsent,
      socialMediaConsent,
      setSocialMediaConsent,
      emergencyTreatmentConsent,
      setEmergencyTreatmentConsent,
      handleSave,
    }),
    [
      child,
      status,
      error,
      retry,
      saving,
      firstName,
      lastName,
      nickname,
      dateOfBirth,
      gender,
      relationship,
      primaryPosition,
      allergies,
      medicalConditions,
      medications,
      communicationNotes,
      behavioralNotes,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelation,
      secondaryEmergencyName,
      secondaryEmergencyPhone,
      photoConsent,
      videoConsent,
      socialMediaConsent,
      emergencyTreatmentConsent,
      addItem,
      removeItem,
      handleSave,
    ],
  );
}
