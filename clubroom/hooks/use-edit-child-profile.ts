import { useRef, useState } from 'react';

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
import { toDateStr } from '@/utils/format';
import { useAuth } from '@/hooks/use-auth';

import { runAsyncFinally } from '@/utils/async-control';

const GENDER_OPTIONS: Gender[] = ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'];
const RELATIONSHIP_OPTIONS: Relationship[] = ['SON', 'DAUGHTER', 'WARD', 'GRANDCHILD', 'OTHER'];

type EditChildProfileContext =
  | { access: 'ready'; child: ChildProfile }
  | { access: 'denied'; child: null };

function parseDateOnly(value?: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : null;
}

export function useEditChildProfile() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { currentUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const hydratedChildId = useRef<string | null>(null);
  const submissionInFlight = useRef(false);

  const [firstName, setFirstNameState] = useState('');
  const [lastName, setLastNameState] = useState('');
  const [nickname, setNicknameState] = useState('');
  const [dateOfBirth, setDateOfBirthState] = useState<Date | null>(null);
  const [gender, setGenderState] = useState<Gender>('PREFER_NOT_TO_SAY');
  const [relationship, setRelationshipState] = useState<Relationship>('OTHER');
  const [primaryPosition, setPrimaryPositionState] = useState<PositionRole | null>(null);

  const clearFormError = () => setFormError(null);
  const setFirstName = (value: string) => {
    clearFormError();
    setFirstNameState(value);
  };
  const setLastName = (value: string) => {
    clearFormError();
    setLastNameState(value);
  };
  const setNickname = (value: string) => {
    clearFormError();
    setNicknameState(value);
  };
  const setDateOfBirth = (value: Date | null) => {
    clearFormError();
    setDateOfBirthState(value);
  };
  const setGender = (value: Gender) => {
    clearFormError();
    setGenderState(value);
  };
  const setRelationship = (value: Relationship) => {
    clearFormError();
    setRelationshipState(value);
  };
  const setPrimaryPosition = (value: PositionRole | null) => {
    clearFormError();
    setPrimaryPositionState(value);
  };

  const hydrate = (child: ChildProfile) => {
    if (hydratedChildId.current === child.id) {
      return;
    }
    setFirstNameState(child.firstName);
    setLastNameState(child.lastName);
    setNicknameState(child.nickname ?? '');
    setDateOfBirthState(parseDateOnly(child.dateOfBirth));
    setGenderState(child.gender);
    setRelationshipState(child.relationship);
    setPrimaryPositionState(child.primaryPosition ?? null);
    setFormError(null);
    hydratedChildId.current = child.id;
  };

  const load = async () => {
    if (!childId) {
      return err(serviceError('VALIDATION', 'Missing child ID.'));
    }

    const accessResult = await childService.canManageChildProfile(childId, currentUser);
    if (!accessResult.success) {
      return accessResult;
    }
    if (!accessResult.data) {
      return ok<EditChildProfileContext>({ access: 'denied', child: null });
    }

    const child = await childService.getChild(childId);
    if (!child) {
      return err(serviceError('NOT_FOUND', 'Child not found.'));
    }
    hydrate(child);
    return ok<EditChildProfileContext>({ access: 'ready', child });
  };

  const { data, status, error, retry } = useScreen<EditChildProfileContext>({
    load,
    deps: [childId],
    isEmpty: () => false,
    loadingStrategy: 'section-skeleton',
    dataKey: childId ? `edit-child-profile:${childId}` : 'edit-child-profile:missing',
  });

  const child = data?.access === 'ready' ? data.child : null;
  const selectedDate = dateOfBirth ? toDateStr(dateOfBirth) : '';
  const isDirty = Boolean(
    child &&
    (firstName.trim() !== child.firstName.trim() ||
      lastName.trim() !== child.lastName.trim() ||
      nickname.trim() !== (child.nickname?.trim() ?? '') ||
      selectedDate !== (child.dateOfBirth?.slice(0, 10) ?? '') ||
      gender !== child.gender ||
      relationship !== child.relationship ||
      primaryPosition !== (child.primaryPosition ?? null)),
  );

  const validate = () => {
    if (!firstName.trim() || !lastName.trim()) {
      setFormError('Enter the player’s first and last name.');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (submissionInFlight.current || !child || !isDirty || !validate()) {
      return;
    }

    submissionInFlight.current = true;
    setSaving(true);
    setFormError(null);

    return await runAsyncFinally(
      async () => {
        const updates: Partial<CreateChildInput> = {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          nickname: nickname.trim(),
          dateOfBirth: selectedDate,
          gender,
          relationship,
          primaryPosition,
        };

        const result = await childService.updateChild(child.id, updates);
        if (!result.success) {
          setFormError(result.error.message || 'Profile changes were not saved.');
          return;
        }
        uiFeedback.showToast('Player profile updated.', 'success');
        router.back();
      },
      () => {
        submissionInFlight.current = false;
        setSaving(false);
      },
    );
  };

  return {
    child,
    access: data?.access ?? null,
    loading: status === 'loading',
    status,
    error: status === 'error' ? (error as ServiceError | null) : null,
    retry,
    saving,
    formError,
    canSave: isDirty && !saving,
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
    handleSave,
  };
}
