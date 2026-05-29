/**
 * Hook for the Edit Child SEN modal.
 * Loads existing child profile and provides editing for disabilities,
 * special needs, communication/behavioral notes.
 */

import { useState } from 'react';

import { router, useLocalSearchParams } from 'expo-router';

import {
  childService,
  type ChildProfile,
  type SpecialNeed,
} from '@/services/child-service';
import { useScreen } from '@/hooks/use-screen';
import { useAuth } from '@/hooks/use-auth';
import { ok, err, serviceError, type ServiceError } from '@/types/result';
import { ServiceEvents } from '@/services/event-bus';
import { uiFeedback } from '@/services/ui-feedback';

import { runAsyncFinally } from '@/utils/async-control';

export function useEditChildSen() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { currentUser } = useAuth();

  const [saving, setSaving] = useState(false);

  // Disability form fields
  const [selectedDisabilityType, setSelectedDisabilityType] = useState<string | null>(null);
  const [disabilityDescription, setDisabilityDescription] = useState('');
  const [diagnosisDate, setDiagnosisDate] = useState('');
  const [supportRequired, setSupportRequired] = useState('');
  const [commPrefs, setCommPrefs] = useState<string[]>([]);
  const [triggers, setTriggers] = useState<string[]>([]);
  const [calmingStrategies, setCalmingStrategies] = useState<string[]>([]);

  // Special need form fields
  const [snCategory, setSnCategory] = useState<SpecialNeed['category'] | null>(null);
  const [snName, setSnName] = useState('');
  const [snDescription, setSnDescription] = useState('');
  const [snSeverity, setSnSeverity] = useState<SpecialNeed['severity'] | undefined>(undefined);
  const [snAccommodations, setSnAccommodations] = useState<string[]>([]);
  const [snParentHints, setSnParentHints] = useState('');

  // Notes
  const [communicationNotes, setCommunicationNotes] = useState('');
  const [behavioralNotes, setBehavioralNotes] = useState('');
  const [notesInitialised, setNotesInitialised] = useState(false);

  const loadChild = async () => {
    if (!childId) return err(serviceError('VALIDATION', 'Missing child ID.'));
    const child = await childService.getChild(childId);
    if (!child) return err(serviceError('NOT_FOUND', 'Child not found.'));
    // Initialise notes from loaded data (once)
    if (!notesInitialised) {
      setCommunicationNotes(child.communicationNotes ?? '');
      setBehavioralNotes(child.behavioralNotes ?? '');
      setNotesInitialised(true);
    }
    return ok(child);
  };

  const { data: child, status, error, retry } = useScreen<ChildProfile>({
    load: loadChild,
    deps: [childId],
    isEmpty: (c) => !c,
    loadingStrategy: 'section-skeleton',
    dataKey: childId ? `edit-child-sen:${childId}` : 'edit-child-sen:missing',
    events: [ServiceEvents.CHILD_SEN_UPDATED],
  });

  const addDisability = async () => {
    if (!child || !selectedDisabilityType) return;
    setSaving(true);

    await runAsyncFinally(async () => {
      const result = await childService.addDisability(child.id, {
        type: selectedDisabilityType,
        description: disabilityDescription || undefined,
        diagnosisDate: diagnosisDate || undefined,
        supportRequired: supportRequired || undefined,
        communicationPreferences: commPrefs.length > 0 ? commPrefs : undefined,
        triggers: triggers.length > 0 ? triggers : undefined,
        calmingStrategies: calmingStrategies.length > 0 ? calmingStrategies : undefined,
      });
      if (result.success) {
        setSelectedDisabilityType(null);
        setDisabilityDescription('');
        setDiagnosisDate('');
        setSupportRequired('');
        setCommPrefs([]);
        setTriggers([]);
        setCalmingStrategies([]);
      }
    }, () => {
      setSaving(false);
    });
  };

  const removeDisability = async (disabilityId: string) => {
    if (!child) return;
    await childService.removeDisability(child.id, disabilityId);
  };

  const addSpecialNeed = async () => {
    if (!child || !snCategory || !snName.trim()) return;
    setSaving(true);

    await runAsyncFinally(async () => {
      const result = await childService.addSpecialNeed(child.id, {
        category: snCategory,
        name: snName.trim(),
        description: snDescription.trim() || undefined,
        severity: snSeverity,
        accommodationsNeeded: snAccommodations.length > 0 ? snAccommodations : undefined,
        parentHints: snParentHints.trim() || undefined,
      });
      if (result.success) {
        setSnCategory(null);
        setSnName('');
        setSnDescription('');
        setSnSeverity(undefined);
        setSnAccommodations([]);
        setSnParentHints('');
      }
    }, () => {
      setSaving(false);
    });
  };

  const removeSpecialNeed = async (specialNeedId: string) => {
    if (!child) return;
    await childService.removeSpecialNeed(child.id, specialNeedId);
  };

  const saveNotes = async () => {
    if (!child || !currentUser?.id) return;
    setSaving(true);

    await runAsyncFinally(async () => {
      const result = await childService.updateChild(child.id, {
        communicationNotes: communicationNotes.trim() || undefined,
        behavioralNotes: behavioralNotes.trim() || undefined,
      });
      if (result.success) {
        uiFeedback.showToast('SEN information updated.', 'success');
router.back();
      } else {
        uiFeedback.showToast('Failed to save. Please try again.', 'error');
      }
    }, () => {
      setSaving(false);
    });
  };

  return {
    child,
    loading: status === 'loading',
    status,
    error: status === 'error' ? (error as ServiceError | null) : null,
    retry,
    saving,
    // Disability form
    selectedDisabilityType,
    disabilityDescription,
    diagnosisDate,
    supportRequired,
    commPrefs,
    triggers,
    calmingStrategies,
    onSelectedDisabilityTypeChange: setSelectedDisabilityType,
    onDisabilityDescriptionChange: setDisabilityDescription,
    onDiagnosisDateChange: setDiagnosisDate,
    onSupportRequiredChange: setSupportRequired,
    onCommPrefsChange: setCommPrefs,
    onTriggersChange: setTriggers,
    onCalmingStrategiesChange: setCalmingStrategies,
    addDisability,
    removeDisability,
    // Special need form
    snCategory,
    snName,
    snDescription,
    snSeverity,
    snAccommodations,
    snParentHints,
    onSnCategoryChange: setSnCategory,
    onSnNameChange: setSnName,
    onSnDescriptionChange: setSnDescription,
    onSnSeverityChange: setSnSeverity,
    onSnAccommodationsChange: setSnAccommodations,
    onSnParentHintsChange: setSnParentHints,
    addSpecialNeed,
    removeSpecialNeed,
    // Notes
    communicationNotes,
    behavioralNotes,
    onCommunicationNotesChange: setCommunicationNotes,
    onBehavioralNotesChange: setBehavioralNotes,
    saveNotes,
  };
}
