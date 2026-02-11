/**
 * useGroupRoster — All state, data loading, and handlers for the Session Roster screen.
 * Manages roster list, filtering, roll call, and injury reporting.
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { createLogger } from '@/utils/logger';
import { groupSessionService } from '@/services/group-session-service';
import { injuryService } from '@/services/injury-service';
import type { GroupSession, GroupRegistration, BodyPart, InjurySeverity } from '@/constants/types';
import { getGroupRegistrationAthleteName } from '@/utils/group-display';

const logger = createLogger('SessionRosterScreen');

export type RosterFilter = 'all' | 'registered' | 'waitlisted' | 'attended';
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'unmarked';

export const BODY_PART_CATEGORIES: { label: string; parts: { part: BodyPart; label: string }[] }[] = [
  {
    label: 'Lower Body',
    parts: [
      { part: 'LEFT_ANKLE', label: 'L. Ankle' }, { part: 'RIGHT_ANKLE', label: 'R. Ankle' },
      { part: 'LEFT_KNEE', label: 'L. Knee' }, { part: 'RIGHT_KNEE', label: 'R. Knee' },
      { part: 'LEFT_THIGH', label: 'L. Thigh' }, { part: 'RIGHT_THIGH', label: 'R. Thigh' },
      { part: 'LEFT_CALF', label: 'L. Calf' }, { part: 'RIGHT_CALF', label: 'R. Calf' },
      { part: 'LEFT_FOOT', label: 'L. Foot' }, { part: 'RIGHT_FOOT', label: 'R. Foot' },
    ],
  },
  {
    label: 'Upper Body',
    parts: [
      { part: 'LEFT_SHOULDER', label: 'L. Shoulder' }, { part: 'RIGHT_SHOULDER', label: 'R. Shoulder' },
      { part: 'LEFT_ARM', label: 'L. Arm' }, { part: 'RIGHT_ARM', label: 'R. Arm' },
      { part: 'LEFT_WRIST', label: 'L. Wrist' }, { part: 'RIGHT_WRIST', label: 'R. Wrist' },
      { part: 'LEFT_HAND', label: 'L. Hand' }, { part: 'RIGHT_HAND', label: 'R. Hand' },
    ],
  },
  {
    label: 'Core & Head',
    parts: [
      { part: 'HEAD', label: 'Head' }, { part: 'NECK', label: 'Neck' },
      { part: 'CHEST', label: 'Chest' }, { part: 'UPPER_BACK', label: 'Upper Back' },
      { part: 'LOWER_BACK', label: 'Lower Back' }, { part: 'ABDOMEN', label: 'Abdomen' },
    ],
  },
];

export const SEVERITY_OPTIONS: { value: InjurySeverity; label: string; color: string }[] = [
  { value: 'MINOR', label: 'Minor', color: '#F59E0B' },
  { value: 'MODERATE', label: 'Moderate', color: '#F97316' },
  { value: 'SEVERE', label: 'Severe', color: '#EF4444' },
];

export function useGroupRoster(sessionId: string | undefined) {
  const [session, setSession] = useState<GroupSession | null>(null);
  const [roster, setRoster] = useState<GroupRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<RosterFilter>('all');
  const [showRollCall, setShowRollCall] = useState(false);
  const [rollCallAttendance, setRollCallAttendance] = useState<Record<string, AttendanceStatus>>({});

  // Injury report state
  const [showInjuryReport, setShowInjuryReport] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<GroupRegistration | null>(null);
  const [injuryBodyPart, setInjuryBodyPart] = useState<BodyPart | null>(null);
  const [injurySeverity, setInjurySeverity] = useState<InjurySeverity>('MINOR');
  const [injuryDescription, setInjuryDescription] = useState('');
  const [savingInjury, setSavingInjury] = useState(false);

  const loadData = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const [sessionData, rosterData] = await Promise.all([
        groupSessionService.getSession(sessionId),
        groupSessionService.getSessionRoster(sessionId),
      ]);
      setSession(sessionData);
      setRoster(rosterData);
    } catch (error) {
      logger.error('Failed to load roster:', error);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleMarkAttendance = useCallback(async (registration: GroupRegistration, attended: boolean) => {
    if (!session) return;
    const date = session.schedule[0]?.date;
    if (!date) return;
    try {
      await groupSessionService.markAttendance(registration.id, date, attended);
      await loadData();
    } catch (error) {
      logger.error('Failed to mark attendance:', error);
      Alert.alert('Error', 'Failed to update attendance.');
    }
  }, [session, loadData]);

  const handleCancelRegistration = useCallback(async (registration: GroupRegistration) => {
    Alert.alert('Cancel Registration', `Remove ${getGroupRegistrationAthleteName(registration)} from this session?`, [
      { text: 'No', style: 'cancel' },
      { text: 'Yes, Remove', style: 'destructive', onPress: async () => {
        try { await groupSessionService.cancelRegistration(registration.id); await loadData(); }
        catch (error) { logger.error('Failed to cancel registration:', error); }
      }},
    ]);
  }, [loadData]);

  const startRollCall = useCallback(() => {
    const initial: Record<string, AttendanceStatus> = {};
    roster.filter(r => r.status === 'REGISTERED' || r.status === 'ATTENDED').forEach(r => {
      initial[r.id] = r.status === 'ATTENDED' ? 'present' : 'unmarked';
    });
    setRollCallAttendance(initial);
    setShowRollCall(true);
  }, [roster]);

  const markRollCallStatus = useCallback((id: string, status: AttendanceStatus) => {
    setRollCallAttendance(prev => ({ ...prev, [id]: status }));
  }, []);

  const markAllPresent = useCallback(() => {
    const updated = { ...rollCallAttendance };
    roster.filter(r => r.status === 'REGISTERED' || r.status === 'ATTENDED').forEach(r => { updated[r.id] = 'present'; });
    setRollCallAttendance(updated);
  }, [rollCallAttendance, roster]);

  const resetRollCall = useCallback(() => {
    const updated = { ...rollCallAttendance };
    roster.filter(r => r.status === 'REGISTERED' || r.status === 'ATTENDED').forEach(r => { updated[r.id] = 'unmarked'; });
    setRollCallAttendance(updated);
  }, [rollCallAttendance, roster]);

  const saveRollCall = useCallback(async () => {
    if (!session) return;
    const date = session.schedule[0]?.date;
    if (!date) return;
    try {
      for (const [registrationId, status] of Object.entries(rollCallAttendance)) {
        if (status === 'present' || status === 'late') await groupSessionService.markAttendance(registrationId, date, true);
        else if (status === 'absent') await groupSessionService.markAttendance(registrationId, date, false);
      }
      await loadData();
      setShowRollCall(false);
      Alert.alert('Success', 'Roll call saved successfully!');
    } catch (error) {
      logger.error('Failed to save roll call:', error);
      Alert.alert('Error', 'Failed to save roll call. Please try again.');
    }
  }, [session, rollCallAttendance, loadData]);

  const openInjuryReport = useCallback((registration: GroupRegistration) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedParticipant(registration);
    setInjuryBodyPart(null);
    setInjurySeverity('MINOR');
    setInjuryDescription('');
    setShowInjuryReport(true);
  }, []);

  const submitInjuryReport = useCallback(async () => {
    if (!selectedParticipant || !injuryBodyPart || !injuryDescription.trim()) {
      Alert.alert('Missing Information', 'Please select a body part and provide a description.');
      return;
    }
    setSavingInjury(true);
    try {
      const ctx = session ? ` during ${session.title}` : '';
      await injuryService.logInjury(selectedParticipant.athleteId, {
        bodyPart: injuryBodyPart, severity: injurySeverity,
        description: injuryDescription.trim() + ctx, occurredAt: new Date().toISOString(), sharedWithCoach: true,
      }, getGroupRegistrationAthleteName(selectedParticipant));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowInjuryReport(false);
      Alert.alert('Injury Reported', `Injury logged for ${getGroupRegistrationAthleteName(selectedParticipant)}. The athlete can track their recovery in the Health section.`);
    } catch (error) {
      logger.error('Failed to report injury:', error);
      Alert.alert('Error', 'Failed to report injury. Please try again.');
    } finally {
      setSavingInjury(false);
    }
  }, [selectedParticipant, injuryBodyPart, injuryDescription, injurySeverity, session]);

  const rollCallStats = useMemo(() => {
    const entries = Object.entries(rollCallAttendance);
    return {
      total: entries.length,
      present: entries.filter(([, s]) => s === 'present').length,
      late: entries.filter(([, s]) => s === 'late').length,
      absent: entries.filter(([, s]) => s === 'absent').length,
      unmarked: entries.filter(([, s]) => s === 'unmarked').length,
    };
  }, [rollCallAttendance]);

  const rollCallParticipants = roster.filter(r => r.status === 'REGISTERED' || r.status === 'ATTENDED');
  const registeredCount = rollCallParticipants.length;
  const waitlistedCount = roster.filter(r => r.status === 'WAITLISTED').length;

  const filteredRoster = roster.filter((r) => {
    if (filter === 'registered') return r.status === 'REGISTERED';
    if (filter === 'waitlisted') return r.status === 'WAITLISTED';
    if (filter === 'attended') return r.status === 'ATTENDED';
    return true;
  });

  const filters: { key: RosterFilter; label: string; count?: number }[] = [
    { key: 'all', label: 'All', count: roster.length },
    { key: 'registered', label: 'Registered', count: registeredCount },
    { key: 'waitlisted', label: 'Waitlist', count: waitlistedCount },
    { key: 'attended', label: 'Attended' },
  ];

  return {
    session, roster, loading, filter, setFilter,
    showRollCall, setShowRollCall, rollCallAttendance, rollCallStats, rollCallParticipants,
    showInjuryReport, setShowInjuryReport, selectedParticipant,
    injuryBodyPart, setInjuryBodyPart, injurySeverity, setInjurySeverity,
    injuryDescription, setInjuryDescription, savingInjury,
    filteredRoster, filters, registeredCount, waitlistedCount,
    handleMarkAttendance, handleCancelRegistration,
    startRollCall, markRollCallStatus, markAllPresent, resetRollCall, saveRollCall,
    openInjuryReport, submitInjuryReport,
  };
}
