/**
 * useDrillAssign — All state, data loading, and handlers for the Assign Drill screen.
 */
import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/hooks/use-auth';
import { drillService } from '@/services/drill-service';
import { rosterService } from '@/services/roster-service';
import { createLogger } from '@/utils/logger';
import type { Drill, RosterEntry } from '@/constants/types';

const logger = createLogger('AssignDrillScreen');

export interface DrillAthlete {
  id: string;
  name: string;
  age?: number;
}

export function useDrillAssign() {
  const { drillId } = useLocalSearchParams<{ drillId?: string }>();
  const { currentUser } = useAuth();

  const [drill, setDrill] = useState<Drill | null>(null);
  const [athletes, setAthletes] = useState<DrillAthlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedAthlete, setSelectedAthlete] = useState<DrillAthlete | null>(null);
  const [dueDate, setDueDate] = useState<Date>(() => {
    const d = new Date(); d.setDate(d.getDate() + 7); return d;
  });
  const [notes, setNotes] = useState('');
  const [repetitions, setRepetitions] = useState('1');
  const [priority, setPriority] = useState<1 | 2 | 3>(2);

  const coachId = currentUser?.id ?? 'coach1';
  const coachName = currentUser?.name ?? 'Coach';

  useEffect(() => {
    async function loadData() {
      try {
        if (drillId) setDrill(await drillService.getDrillById(drillId));
        if (coachId) {
          const roster = await rosterService.getRoster(coachId, { status: 'ACTIVE' });
          setAthletes(roster.map((e: RosterEntry) => ({ id: e.athleteId, name: e.athleteName, age: e.athleteAge })));
        }
      } catch (error) {
        logger.error('Failed to load data', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [drillId, coachId]);

  const handleDateSelect = useCallback((daysFromNow: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const d = new Date(); d.setDate(d.getDate() + daysFromNow); setDueDate(d);
  }, []);

  const handlePrioritySelect = useCallback((p: 1 | 2 | 3) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPriority(p);
  }, []);

  const handleAthleteSelect = useCallback((athlete: DrillAthlete) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedAthlete(prev => prev?.id === athlete.id ? null : athlete);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!drill || !selectedAthlete) {
      Alert.alert('Missing Information', 'Please select a drill and athlete.'); return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setSubmitting(true);
    try {
      await drillService.assignDrill(drill.id, selectedAthlete.id, selectedAthlete.name, coachId, coachName, {
        dueDate: dueDate.toISOString(), notes: notes.trim() || undefined,
        repetitions: parseInt(repetitions, 10) || 1, priority,
      });
      Alert.alert('Drill Assigned!', `"${drill.title}" has been assigned to ${selectedAthlete.name}.`, [
        { text: 'Assign Another', onPress: () => { setSelectedAthlete(null); setNotes(''); setRepetitions('1'); setPriority(2); } },
        { text: 'Done', onPress: () => router.back() },
      ]);
    } catch (error) {
      logger.error('Failed to assign drill', error);
      Alert.alert('Error', 'Failed to assign drill. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [drill, selectedAthlete, coachId, coachName, dueDate, notes, repetitions, priority]);

  const formatDate = (d: Date): string =>
    d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

  const getDaysFromNow = (d: Date): number => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const target = new Date(d); target.setHours(0, 0, 0, 0);
    return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  return {
    drill, athletes, loading, submitting,
    selectedAthlete, dueDate, notes, setNotes,
    repetitions, setRepetitions, priority,
    daysFromNow: getDaysFromNow(dueDate), formattedDate: formatDate(dueDate),
    handleDateSelect, handlePrioritySelect, handleAthleteSelect, handleSubmit,
  };
}
