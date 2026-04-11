import { useCallback, useMemo, useState } from 'react';

import { router, useLocalSearchParams } from 'expo-router';

import {
  childService,
  type ChildProfile,
  type CreateChildInput,
  type Gender,
  type Relationship,
} from '@/services/child-service';
import { useScreen } from '@/hooks/use-screen';
import { Routes } from '@/navigation/routes';
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

  const [communicationNotes, setCommunicationNotes] = useState('');
  const [behavioralNotes, setBehavioralNotes] = useState('');

  const hydrate = useCallback(
    (child: ChildProfile) => {
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
      setCommunicationNotes(child.communicationNotes ?? '');
      setBehavioralNotes(child.behavioralNotes ?? '');
      setInitialized(true);
    },
    [initialized],
  );

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

  const {
    data: child,
    status,
    error,
    retry,
  } = useScreen<ChildProfile>({
    load,
    deps: [childId],
    isEmpty: (value) => !value,
  });

  const validate = useCallback(() => {
    if (!firstName.trim() || !lastName.trim()) {
      uiFeedback.showToast('Please enter first and last name.', 'error');
      return false;
    }
    return true;
  }, [firstName, lastName]);

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
        communicationNotes: communicationNotes.trim() || undefined,
        behavioralNotes: behavioralNotes.trim() || undefined,
      };

      const result = await childService.updateChild(child.id, updates);
      if (!result.success) {
        uiFeedback.showToast('Failed to save profile. Please try again.', 'error');
        return;
      }
      uiFeedback.showToast('Child profile updated.', 'success');
      router.back();
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
    communicationNotes,
    behavioralNotes,
  ]);

  const openMedicalInfo = useCallback(() => {
    if (!child) {
      return;
    }
    router.push(Routes.childMedical(child.id));
  }, [child]);

  const openEmergencyContacts = useCallback(() => {
    if (!child) {
      return;
    }
    router.push(Routes.childEmergency(child.id));
  }, [child]);

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
      communicationNotes,
      setCommunicationNotes,
      behavioralNotes,
      setBehavioralNotes,
      openMedicalInfo,
      openEmergencyContacts,
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
      communicationNotes,
      behavioralNotes,
      openMedicalInfo,
      openEmergencyContacts,
      handleSave,
    ],
  );
}
