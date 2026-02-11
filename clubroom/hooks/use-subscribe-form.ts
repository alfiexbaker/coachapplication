/**
 * useSubscribeForm — State, computed values, and handlers for SubscribeForm.
 */
import { useState, useMemo, useCallback } from 'react';
import { Platform } from 'react-native';
import { RecurrenceFrequency, CreateRecurringBookingParams } from '@/constants/types';

export interface CoachInfo {
  id: string;
  name: string;
  photoUrl?: string;
  sessionTypes?: string[];
  pricePerSession?: number;
  location?: string;
}

export interface AthleteInfo {
  id: string;
  name: string;
}

export interface DayOption {
  value: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  label: string;
  shortLabel: string;
}

export const DAYS: DayOption[] = [
  { value: 0, label: 'Sunday', shortLabel: 'Sun' },
  { value: 1, label: 'Monday', shortLabel: 'Mon' },
  { value: 2, label: 'Tuesday', shortLabel: 'Tue' },
  { value: 3, label: 'Wednesday', shortLabel: 'Wed' },
  { value: 4, label: 'Thursday', shortLabel: 'Thu' },
  { value: 5, label: 'Friday', shortLabel: 'Fri' },
  { value: 6, label: 'Saturday', shortLabel: 'Sat' },
];

export const DURATION_OPTIONS = [30, 45, 60, 90, 120];

export const DEFAULT_SESSION_TYPES = [
  '1-on-1 Training',
  'Group Training',
  'Skills Assessment',
  'Technique Coaching',
];

export function formatTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

interface UseSubscribeFormParams {
  coach: CoachInfo;
  userId: string;
  userName: string;
  athletes?: AthleteInfo[];
  onSubmit: (params: CreateRecurringBookingParams) => Promise<void>;
  defaultValues?: Partial<{
    dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
    time: string;
    frequency: RecurrenceFrequency;
    sessionType: string;
    duration: number;
  }>;
}

export function useSubscribeForm({
  coach,
  userId,
  userName,
  athletes,
  onSubmit,
  defaultValues,
}: UseSubscribeFormParams) {
  const [dayOfWeek, setDayOfWeek] = useState<0 | 1 | 2 | 3 | 4 | 5 | 6>(
    defaultValues?.dayOfWeek ?? 1,
  );
  const [time, setTime] = useState(defaultValues?.time ?? '10:00');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [frequency, setFrequency] = useState<RecurrenceFrequency>(
    defaultValues?.frequency ?? 'WEEKLY',
  );
  const [sessionType, setSessionType] = useState(
    defaultValues?.sessionType ?? coach.sessionTypes?.[0] ?? DEFAULT_SESSION_TYPES[0],
  );
  const [duration, setDuration] = useState(defaultValues?.duration ?? 60);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | undefined>(athletes?.[0]?.id);
  const [location, setLocation] = useState(coach.location ?? '');
  const [notes, setNotes] = useState('');
  const [hasEndDate, setHasEndDate] = useState(false);
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const sessionTypes = coach.sessionTypes ?? DEFAULT_SESSION_TYPES;
  const selectedAthlete = athletes?.find((a) => a.id === selectedAthleteId);

  const monthlyEstimate = useMemo(() => {
    if (!coach.pricePerSession) return null;
    const sessionsPerMonth = frequency === 'WEEKLY' ? 4 : frequency === 'BIWEEKLY' ? 2 : 1;
    return coach.pricePerSession * sessionsPerMonth;
  }, [coach.pricePerSession, frequency]);

  const timeDate = useMemo(() => {
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }, [time]);

  const handleTimeChange = useCallback((event: unknown, selectedDate?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      setTime(`${hours}:${minutes}`);
    }
  }, []);

  const handleEndDateChange = useCallback((event: unknown, selectedDate?: Date) => {
    setShowEndDatePicker(Platform.OS === 'ios');
    if (selectedDate) setEndDate(selectedDate);
  }, []);

  const handleSubmit = useCallback(async () => {
    const startDate = new Date();
    while (startDate.getDay() !== dayOfWeek) {
      startDate.setDate(startDate.getDate() + 1);
    }
    const params: CreateRecurringBookingParams = {
      userId,
      coachId: coach.id,
      athleteId: selectedAthleteId,
      dayOfWeek,
      time,
      duration,
      location,
      sessionType,
      frequency,
      startDate: startDate.toISOString(),
      endDate: hasEndDate && endDate ? endDate.toISOString() : undefined,
      pricePerSession: coach.pricePerSession,
      notes: notes.trim() || undefined,
    };
    await onSubmit(params);
  }, [
    userId,
    coach,
    selectedAthleteId,
    dayOfWeek,
    time,
    duration,
    location,
    sessionType,
    frequency,
    hasEndDate,
    endDate,
    notes,
    onSubmit,
  ]);

  const toggleEndDate = useCallback(() => setHasEndDate((v) => !v), []);
  const isValid = location.trim().length > 0;

  return {
    dayOfWeek,
    setDayOfWeek,
    time,
    showTimePicker,
    setShowTimePicker,
    timeDate,
    handleTimeChange,
    frequency,
    setFrequency,
    sessionType,
    setSessionType,
    sessionTypes,
    duration,
    setDuration,
    selectedAthleteId,
    setSelectedAthleteId,
    selectedAthlete,
    location,
    setLocation,
    notes,
    setNotes,
    hasEndDate,
    toggleEndDate,
    endDate,
    showEndDatePicker,
    setShowEndDatePicker,
    handleEndDateChange,
    monthlyEstimate,
    handleSubmit,
    isValid,
  };
}
