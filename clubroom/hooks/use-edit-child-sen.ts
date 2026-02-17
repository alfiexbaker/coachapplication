/**
 * Hook for the Edit Child SEN modal.
 * Loads existing child profile and provides editing for disabilities,
 * special needs, communication/behavioral notes.
 */

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import {
  childService,
  type ChildProfile,
  type Disability,
  type SpecialNeed,
} from '@/services/child-service';
import { useScreen } from '@/hooks/use-screen';
import { useAuth } from '@/hooks/use-auth';
import { ok, err, serviceError, type ServiceError } from '@/types/result';
import { ServiceEvents } from '@/services/event-bus';

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

  const loadChild = useCallback(async () => {
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
  }, [childId, notesInitialised]);

  const { data: child, status, error, retry } = useScreen<ChildProfile>({
    load: loadChild,
    deps: [childId],
    isEmpty: (c) => !c,
    events: [ServiceEvents.CHILD_SEN_UPDATED],
  });

  const addDisability = useCallback(async () => {
    if (!child || !selectedDisabilityType) return;
    setSaving(true);
    try {
      const result = await childService.addDisability(child.id, {
        id: `dis-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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
    } finally {
      setSaving(false);
    }
  }, [child, selectedDisabilityType, disabilityDescription, diagnosisDate, supportRequired, commPrefs, triggers, calmingStrategies]);

  const removeDisability = useCallback(async (disabilityId: string) => {
    if (!child) return;
    await childService.removeDisability(child.id, disabilityId);
  }, [child]);

  const addSpecialNeed = useCallback(async () => {
    if (!child || !snCategory || !snName.trim()) return;
    setSaving(true);
    try {
      const result = await childService.addSpecialNeed(child.id, {
        id: `sn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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
    } finally {
      setSaving(false);
    }
  }, [child, snCategory, snName, snDescription, snSeverity, snAccommodations, snParentHints]);

  const removeSpecialNeed = useCallback(async (specialNeedId: string) => {
    if (!child) return;
    await childService.removeSpecialNeed(child.id, specialNeedId);
  }, [child]);

  const saveNotes = useCallback(async () => {
    if (!child || !currentUser?.id) return;
    setSaving(true);
    try {
      const result = await childService.updateChild(child.id, currentUser.id, {
        communicationNotes: communicationNotes.trim() || undefined,
        behavioralNotes: behavioralNotes.trim() || undefined,
      });
      if (result.success) {
        Alert.alert('Saved', 'SEN information updated.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('Error', 'Failed to save. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  }, [child, currentUser, communicationNotes, behavioralNotes]);

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
