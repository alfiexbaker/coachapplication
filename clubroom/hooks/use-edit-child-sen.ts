import { useRef, useState } from 'react';

import { router, useLocalSearchParams } from 'expo-router';

import {
  childService,
  type ChildProfile,
  type Disability,
  type SpecialNeed,
} from '@/services/child-service';
import { useScreen } from '@/hooks/use-screen';
import { err, ok, serviceError, type ServiceError } from '@/types/result';
import { ServiceEvents } from '@/services/event-bus';
import { uiFeedback } from '@/services/ui-feedback';
import { runAsyncFinally } from '@/utils/async-control';
import { generateId } from '@/utils/generate-id';
import { useAuth } from '@/hooks/use-auth';

type EditChildSupportContext =
  | { access: 'ready'; child: ChildProfile }
  | { access: 'denied'; child: null }
  | { access: 'not_found'; child: null };

function supportSnapshot(input: {
  disabilities: Disability[];
  specialNeeds: SpecialNeed[];
  communicationNotes: string;
  behavioralNotes: string;
}): string {
  return JSON.stringify(input);
}

export function useEditChildSen() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { currentUser } = useAuth();
  const hydratedChildId = useRef<string | null>(null);
  const submissionInFlight = useRef(false);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [initialSnapshot, setInitialSnapshot] = useState('');
  const [disabilities, setDisabilitiesState] = useState<Disability[]>([]);
  const [specialNeeds, setSpecialNeedsState] = useState<SpecialNeed[]>([]);

  const [selectedDisabilityType, setSelectedDisabilityTypeState] = useState<string | null>(null);
  const [disabilityDescription, setDisabilityDescriptionState] = useState('');
  const [diagnosisDate, setDiagnosisDateState] = useState('');
  const [supportRequired, setSupportRequiredState] = useState('');
  const [commPrefs, setCommPrefsState] = useState<string[]>([]);
  const [triggers, setTriggersState] = useState<string[]>([]);
  const [calmingStrategies, setCalmingStrategiesState] = useState<string[]>([]);

  const [snCategory, setSnCategoryState] = useState<SpecialNeed['category'] | null>(null);
  const [snName, setSnNameState] = useState('');
  const [snDescription, setSnDescriptionState] = useState('');
  const [snSeverity, setSnSeverityState] = useState<SpecialNeed['severity'] | undefined>(undefined);
  const [snAccommodations, setSnAccommodationsState] = useState<string[]>([]);
  const [snParentHints, setSnParentHintsState] = useState('');

  const [communicationNotes, setCommunicationNotesState] = useState('');
  const [behavioralNotes, setBehavioralNotesState] = useState('');

  const clearFormError = () => setFormError(null);
  const setDisabilities = (value: Disability[]) => {
    clearFormError();
    setDisabilitiesState(value);
  };
  const setSpecialNeeds = (value: SpecialNeed[]) => {
    clearFormError();
    setSpecialNeedsState(value);
  };

  const hydrate = (child: ChildProfile) => {
    if (hydratedChildId.current === child.id) {
      return;
    }

    const nextDisabilities = child.disabilities.map((item) => ({ ...item }));
    const nextSpecialNeeds = child.specialNeeds.map((item) => ({ ...item }));
    const nextCommunicationNotes = child.communicationNotes ?? '';
    const nextBehavioralNotes = child.behavioralNotes ?? '';

    setDisabilitiesState(nextDisabilities);
    setSpecialNeedsState(nextSpecialNeeds);
    setCommunicationNotesState(nextCommunicationNotes);
    setBehavioralNotesState(nextBehavioralNotes);
    setFormError(null);
    setInitialSnapshot(
      supportSnapshot({
        disabilities: nextDisabilities,
        specialNeeds: nextSpecialNeeds,
        communicationNotes: nextCommunicationNotes,
        behavioralNotes: nextBehavioralNotes,
      }),
    );
    hydratedChildId.current = child.id;
  };

  const loadChild = async () => {
    if (!childId) {
      return err(serviceError('VALIDATION', 'Missing child ID.'));
    }

    const accessResult = await childService.canManageChildProfile(childId, currentUser);
    if (!accessResult.success) {
      return accessResult;
    }
    if (!accessResult.data) {
      return ok<EditChildSupportContext>({ access: 'denied', child: null });
    }

    const child = await childService.getChild(childId);
    if (!child) {
      return ok<EditChildSupportContext>({ access: 'not_found', child: null });
    }
    hydrate(child);
    return ok<EditChildSupportContext>({ access: 'ready', child });
  };

  const { data, status, error, retry } = useScreen<EditChildSupportContext>({
    load: loadChild,
    deps: [childId],
    isEmpty: () => false,
    loadingStrategy: 'section-skeleton',
    dataKey: childId ? `edit-child-sen:${childId}` : 'edit-child-sen:missing',
    events: [ServiceEvents.CHILD_SEN_UPDATED],
  });

  const child = data?.access === 'ready' ? data.child : null;
  const currentSnapshot = supportSnapshot({
    disabilities,
    specialNeeds,
    communicationNotes,
    behavioralNotes,
  });
  const isDirty = Boolean(child && currentSnapshot !== initialSnapshot);

  const clearDisabilityDraft = () => {
    setSelectedDisabilityTypeState(null);
    setDisabilityDescriptionState('');
    setDiagnosisDateState('');
    setSupportRequiredState('');
    setCommPrefsState([]);
    setTriggersState([]);
    setCalmingStrategiesState([]);
  };

  const addDisability = () => {
    if (!selectedDisabilityType) {
      return;
    }
    setDisabilities([
      ...disabilities,
      {
        id: generateId('dis'),
        type: selectedDisabilityType,
        description: disabilityDescription.trim() || undefined,
        diagnosisDate: diagnosisDate.trim() || undefined,
        supportRequired: supportRequired.trim() || undefined,
        communicationPreferences: commPrefs.length > 0 ? commPrefs : undefined,
        triggers: triggers.length > 0 ? triggers : undefined,
        calmingStrategies: calmingStrategies.length > 0 ? calmingStrategies : undefined,
      },
    ]);
    clearDisabilityDraft();
  };

  const removeDisability = (disabilityId: string) => {
    setDisabilities(disabilities.filter((item) => item.id !== disabilityId));
  };

  const onSelectedDisabilityTypeChange = (value: string | null) => {
    clearFormError();
    if (value === null) {
      clearDisabilityDraft();
      return;
    }
    setSelectedDisabilityTypeState(value);
  };

  const clearSpecialNeedDraft = () => {
    clearFormError();
    setSnCategoryState(null);
    setSnNameState('');
    setSnDescriptionState('');
    setSnSeverityState(undefined);
    setSnAccommodationsState([]);
    setSnParentHintsState('');
  };

  const addSpecialNeed = () => {
    if (!snCategory || !snName.trim()) {
      return;
    }
    setSpecialNeeds([
      ...specialNeeds,
      {
        id: generateId('sn'),
        category: snCategory,
        name: snName.trim(),
        description: snDescription.trim() || undefined,
        severity: snSeverity,
        accommodationsNeeded: snAccommodations.length > 0 ? snAccommodations : undefined,
        parentHints: snParentHints.trim() || undefined,
      },
    ]);
    clearSpecialNeedDraft();
  };

  const removeSpecialNeed = (specialNeedId: string) => {
    setSpecialNeeds(specialNeeds.filter((item) => item.id !== specialNeedId));
  };

  const saveSupport = async () => {
    if (submissionInFlight.current || !child || !isDirty) {
      return;
    }

    submissionInFlight.current = true;
    setSaving(true);
    setFormError(null);

    return await runAsyncFinally(
      async () => {
        const result = await childService.updateChild(child.id, {
          disabilities,
          specialNeeds,
          communicationNotes: communicationNotes.trim(),
          behavioralNotes: behavioralNotes.trim(),
        });
        if (!result.success) {
          setFormError(result.error.message || 'Support changes were not saved.');
          return;
        }
        uiFeedback.showToast('Player support updated.', 'success');
        router.back();
      },
      () => {
        submissionInFlight.current = false;
        setSaving(false);
      },
    );
  };

  const change =
    <T>(setter: (value: T) => void) =>
    (value: T) => {
      clearFormError();
      setter(value);
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
    disabilities,
    specialNeeds,
    selectedDisabilityType,
    disabilityDescription,
    diagnosisDate,
    supportRequired,
    commPrefs,
    triggers,
    calmingStrategies,
    onDisabilitiesChange: setDisabilities,
    onSelectedDisabilityTypeChange,
    onDisabilityDescriptionChange: change(setDisabilityDescriptionState),
    onDiagnosisDateChange: change(setDiagnosisDateState),
    onSupportRequiredChange: change(setSupportRequiredState),
    onCommPrefsChange: change(setCommPrefsState),
    onTriggersChange: change(setTriggersState),
    onCalmingStrategiesChange: change(setCalmingStrategiesState),
    addDisability,
    removeDisability,
    snCategory,
    snName,
    snDescription,
    snSeverity,
    snAccommodations,
    snParentHints,
    onSnCategoryChange: change(setSnCategoryState),
    onSnNameChange: change(setSnNameState),
    onSnDescriptionChange: change(setSnDescriptionState),
    onSnSeverityChange: change(setSnSeverityState),
    onSnAccommodationsChange: change(setSnAccommodationsState),
    onSnParentHintsChange: change(setSnParentHintsState),
    addSpecialNeed,
    cancelSpecialNeed: clearSpecialNeedDraft,
    removeSpecialNeed,
    communicationNotes,
    behavioralNotes,
    onCommunicationNotesChange: change(setCommunicationNotesState),
    onBehavioralNotesChange: change(setBehavioralNotesState),
    saveSupport,
  };
}
