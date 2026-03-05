/**
 * useDrillAssign — All state, data loading, and handlers for the Assign Drill screen.
 */
import { useState, useCallback } from 'react';

import { useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { drillService } from '@/services/drill-service';
import { rosterService } from '@/services/roster-service';
import { createLogger } from '@/utils/logger';
import type { Drill, RosterEntry } from '@/constants/types';
import { getRosterAthleteName } from '@/utils/roster-display';
import { err, ok, serviceError, type ServiceError } from '@/types/result';
import { uiFeedback } from '@/services/ui-feedback';

const logger = createLogger('AssignDrillScreen');

export interface DrillAthlete {
  id: string;
  name: string;
  age?: number;
}

interface DrillAssignData {
  drill: Drill | null;
  athletes: DrillAthlete[];
}

export function useDrillAssign() {
  const { drillId } = useLocalSearchParams<{ drillId?: string }>();
  const { currentUser } = useAuth();

  const [submitting, setSubmitting] = useState(false);
  const [selectedAthlete, setSelectedAthlete] = useState<DrillAthlete | null>(null);
  const [dueDate, setDueDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d;
  });
  const [notes, setNotes] = useState('');
  const [repetitions, setRepetitionsState] = useState('1');
  const [priority, setPriority] = useState<1 | 2 | 3>(2);
  const [repetitionsError, setRepetitionsError] = useState<string | null>(null);

  const coachId = currentUser?.id ?? 'coach1';
  const coachName = currentUser?.name ?? 'Coach';

  const loadData = useCallback(async () => {
    if (!drillId) {
      return ok<DrillAssignData>({
        drill: null,
        athletes: [],
      });
    }

    try {
      const [drill, roster] = await Promise.all([
        drillService.getDrillById(drillId),
        coachId ? rosterService.getRoster(coachId, { status: 'ACTIVE' }) : Promise.resolve([]),
      ]);

      return ok<DrillAssignData>({
        drill,
        athletes: roster.map((entry: RosterEntry) => ({
          id: entry.athleteId,
          name: getRosterAthleteName(entry),
        })),
      });
    } catch (loadError) {
      logger.error('Failed to load assign-drill data', loadError);
      return err(serviceError('UNKNOWN', 'Failed to load drill assignment data.', loadError));
    }
  }, [coachId, drillId]);

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<DrillAssignData>({
    load: loadData,
    deps: [drillId, coachId],
    isEmpty: (value) => value.drill === null,
    refetchOnFocus: true,
  });

  const drill = data?.drill ?? null;
  const athletes = data?.athletes ?? [];

  const handleDateSelect = useCallback((daysFromNow: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    setDueDate(d);
  }, []);

  const handlePrioritySelect = useCallback((p: 1 | 2 | 3) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPriority(p);
  }, []);

  const handleAthleteSelect = useCallback((athlete: DrillAthlete) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedAthlete((prev) => (prev?.id === athlete.id ? null : athlete));
  }, []);

  const setRepetitions = useCallback((value: string) => {
    const sanitized = value.replace(/[^0-9]/g, '');
    setRepetitionsState(sanitized);
    if (!sanitized) {
      setRepetitionsError('Minimum 1 rep');
      return;
    }
    const parsed = Number.parseInt(sanitized, 10);
    if (Number.isNaN(parsed) || parsed < 1) {
      setRepetitionsError('Minimum 1 rep');
      return;
    }
    if (parsed > 50) {
      setRepetitionsError('Maximum 50 reps recommended for youth athletes');
      return;
    }
    setRepetitionsError(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!drill || !selectedAthlete) {
      uiFeedback.showToast('Please select a drill and athlete.', 'error');
      return;
    }
    const reps = Number.parseInt(repetitions, 10);
    if (Number.isNaN(reps) || reps < 1 || reps > 50) {
      setRepetitionsError(
        Number.isNaN(reps) || reps < 1 ? 'Minimum 1 rep' : 'Maximum 50 reps recommended for youth athletes',
      );
      uiFeedback.showToast('Reps must be between 1 and 50.', 'error');
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setSubmitting(true);
    try {
      const assignmentResult = await drillService.assignDrill(
        drill.id,
        selectedAthlete.id,
        selectedAthlete.name,
        coachId,
        coachName,
        {
          dueDate: dueDate.toISOString(),
          notes: notes.trim() || undefined,
          repetitions: reps,
          priority,
        },
      );
      if (!assignmentResult.success) {
        uiFeedback.showToast(assignmentResult.error.message, 'error');
        return;
      }
      uiFeedback.showToast(`"${drill.title}" has been assigned to ${selectedAthlete.name}.`, 'success');
      setSelectedAthlete(null);
      setNotes('');
      setRepetitionsState('1');
      setRepetitionsError(null);
      setPriority(2);
    } catch (error) {
      logger.error('Failed to assign drill', error);
      uiFeedback.showToast('Failed to assign drill. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  }, [drill, selectedAthlete, coachId, coachName, dueDate, notes, repetitions, priority]);

  const formatDate = (d: Date): string =>
    d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

  const getDaysFromNow = (d: Date): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(d);
    target.setHours(0, 0, 0, 0);
    return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  return {
    drill,
    athletes,
    loading: status === 'loading',
    status,
    error: status === 'error' ? (error as ServiceError | null) : null,
    refreshing,
    onRefresh,
    retry,
    submitting,
    selectedAthlete,
    dueDate,
    notes,
    setNotes,
    repetitions,
    setRepetitions,
    repetitionsError,
    priority,
    daysFromNow: getDaysFromNow(dueDate),
    formattedDate: formatDate(dueDate),
    handleRefresh: onRefresh,
    handleDateSelect,
    handlePrioritySelect,
    handleAthleteSelect,
    handleSubmit,
  } satisfies {
    drill: Drill | null;
    athletes: DrillAthlete[];
    loading: boolean;
    status: ScreenStatus;
    error: ServiceError | null;
    refreshing: boolean;
    onRefresh: () => void;
    retry: () => void;
    submitting: boolean;
    selectedAthlete: DrillAthlete | null;
    dueDate: Date;
    notes: string;
    setNotes: (value: string) => void;
    repetitions: string;
    setRepetitions: (value: string) => void;
    repetitionsError: string | null;
    priority: 1 | 2 | 3;
    daysFromNow: number;
    formattedDate: string;
    handleRefresh: () => void;
    handleDateSelect: (daysFromNow: number) => void;
    handlePrioritySelect: (priority: 1 | 2 | 3) => void;
    handleAthleteSelect: (athlete: DrillAthlete) => void;
    handleSubmit: () => Promise<void>;
  };
}
