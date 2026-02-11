/**
 * useAvailabilityWizard — State, handlers, and computed values for AvailabilitySetupWizard.
 */
import { useState, useCallback, useMemo } from 'react';
import { Alert, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

import { availabilityService } from '@/services/availability-service';
import { createLogger } from '@/utils/logger';
import type { AvailabilityTemplate } from '@/constants/types';
import type { SessionTemplate } from '@/constants/session-types';

const logger = createLogger('AvailabilitySetupWizard');

export const COMMON_LOCATIONS = [
  'Hackney Marshes',
  'Victoria Park',
  'London Fields',
  'Indoor Facility',
  'Online Session',
];

export const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const DAY_OF_WEEK_MAP: (0 | 1 | 2 | 3 | 4 | 5 | 6)[] = [1, 2, 3, 4, 5, 6, 0];
export const DAYS_FULL_MAP = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export interface DayHours {
  start: string;
  end: string;
}

interface UseAvailabilityWizardParams {
  coachId: string;
  onComplete: () => void;
  existingTemplates?: AvailabilityTemplate[];
  sessionTemplates?: SessionTemplate[];
}

function buildInitialState(existingTemplates?: AvailabilityTemplate[]) {
  if (!existingTemplates || existingTemplates.length === 0) {
    return {
      days: Array(7).fill(false) as boolean[],
      same: true,
      global: { start: '09:00', end: '17:00' } as DayHours,
      perDay: Array(7)
        .fill(null)
        .map(() => ({ start: '09:00', end: '17:00' })) as DayHours[],
    };
  }

  const days = Array(7).fill(false) as boolean[];
  const perDay = Array(7)
    .fill(null)
    .map(() => ({ start: '09:00', end: '17:00' })) as DayHours[];
  let allSame = true;
  let firstStart = '';
  let firstEnd = '';

  for (const tmpl of existingTemplates) {
    const displayIndex = tmpl.dayOfWeek === 0 ? 6 : tmpl.dayOfWeek - 1;
    days[displayIndex] = true;
    perDay[displayIndex] = { start: tmpl.startTime, end: tmpl.endTime };
    if (!firstStart) {
      firstStart = tmpl.startTime;
      firstEnd = tmpl.endTime;
    } else if (tmpl.startTime !== firstStart || tmpl.endTime !== firstEnd) {
      allSame = false;
    }
  }

  return {
    days,
    same: allSame,
    global: { start: firstStart || '09:00', end: firstEnd || '17:00' },
    perDay,
  };
}

export function formatTime(time: string): string {
  const [h] = time.split(':').map(Number);
  if (h === 12) return '12pm';
  if (h === 0) return '12am';
  return h > 12 ? `${h - 12}pm` : `${h}am`;
}

export function useAvailabilityWizard({
  coachId,
  onComplete,
  existingTemplates,
  sessionTemplates,
}: UseAvailabilityWizardParams) {
  const isEditMode = (existingTemplates?.length ?? 0) > 0;
  const initial = buildInitialState(existingTemplates);

  const [step, setStep] = useState(1);
  const [selectedDays, setSelectedDays] = useState<boolean[]>(initial.days);
  const [sameHours, setSameHours] = useState(initial.same);
  const [globalHours, setGlobalHours] = useState<DayHours>(initial.global);
  const [perDayHours, setPerDayHours] = useState<DayHours[]>(initial.perDay);
  const [location, setLocation] = useState('');
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [sessionTemplateId, setSessionTemplateId] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const selectedCount = selectedDays.filter(Boolean).length;

  const toggleDay = useCallback((index: number) => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDays((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  }, []);

  const applyPreset = useCallback((preset: 'weekdays' | 'weekends') => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (preset === 'weekdays') {
      setSelectedDays([true, true, true, true, true, false, false]);
    } else {
      setSelectedDays([false, false, false, false, false, true, true]);
    }
  }, []);

  const getHoursForDay = useCallback(
    (index: number): DayHours => {
      return sameHours ? globalHours : perDayHours[index];
    },
    [sameHours, globalHours, perDayHours],
  );

  const updateDayHours = useCallback(
    (index: number, field: 'start' | 'end', value: string) => {
      if (sameHours) {
        setGlobalHours((prev) => ({ ...prev, [field]: value }));
      } else {
        setPerDayHours((prev) => {
          const next = [...prev];
          next[index] = { ...next[index], [field]: value };
          return next;
        });
      }
    },
    [sameHours],
  );

  const calculateTotalHours = useCallback((): number => {
    let total = 0;
    selectedDays.forEach((selected, i) => {
      if (!selected) return;
      const hours = sameHours ? globalHours : perDayHours[i];
      const [sh, sm] = hours.start.split(':').map(Number);
      const [eh, em] = hours.end.split(':').map(Number);
      total += (eh * 60 + em - (sh * 60 + sm)) / 60;
    });
    return Math.round(total * 10) / 10;
  }, [selectedDays, sameHours, globalHours, perDayHours]);

  const totalHoursLive = calculateTotalHours();

  const toggleSameHours = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSameHours((prev) => !prev);
  }, []);

  const selectLocation = useCallback((loc: string) => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLocation((prev) => (prev === loc ? '' : loc));
    setShowLocationInput(false);
  }, []);

  const selectSessionTemplate = useCallback((id: string | undefined) => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSessionTemplateId(id);
  }, []);

  const linkedSessionTemplate = useMemo(
    () =>
      sessionTemplateId ? sessionTemplates?.find((st) => st.id === sessionTemplateId) : undefined,
    [sessionTemplateId, sessionTemplates],
  );

  const handleConfirm = useCallback(async () => {
    setSaving(true);
    try {
      if (isEditMode && existingTemplates) {
        const removedDays: (0 | 1 | 2 | 3 | 4 | 5 | 6)[] = [];
        for (const tmpl of existingTemplates) {
          const displayIndex = tmpl.dayOfWeek === 0 ? 6 : tmpl.dayOfWeek - 1;
          if (!selectedDays[displayIndex]) {
            removedDays.push(tmpl.dayOfWeek);
          }
        }

        if (removedDays.length > 0) {
          let totalConflicts = 0;
          for (const dow of removedDays) {
            const result = await availabilityService.checkRecurringConflicts(coachId, dow);
            totalConflicts += result.bookingCount + result.holdCount;
          }

          if (totalConflicts > 0) {
            const proceed = await new Promise<boolean>((resolve) => {
              Alert.alert(
                'Appointments on Removed Days',
                `You have ${totalConflicts} appointment${totalConflicts !== 1 ? 's' : ''} on days you're removing. Existing appointments won't be cancelled, but no new ones can be booked.`,
                [
                  { text: 'Go Back', style: 'cancel', onPress: () => resolve(false) },
                  { text: 'Continue', onPress: () => resolve(true) },
                ],
              );
            });
            if (!proceed) {
              setSaving(false);
              return;
            }
          }

          for (const tmpl of existingTemplates) {
            const displayIndex = tmpl.dayOfWeek === 0 ? 6 : tmpl.dayOfWeek - 1;
            if (!selectedDays[displayIndex]) {
              await availabilityService.deleteTemplate(tmpl.id);
            }
          }
        }
      }

      for (let i = 0; i < 7; i++) {
        if (!selectedDays[i]) continue;
        const hours = sameHours ? globalHours : perDayHours[i];
        const dayOfWeek = DAY_OF_WEEK_MAP[i];
        const existingForDay = existingTemplates?.find((t) => t.dayOfWeek === dayOfWeek);

        await availabilityService.saveTemplate({
          ...(existingForDay ? { id: existingForDay.id } : {}),
          coachId,
          dayOfWeek,
          startTime: hours.start,
          endTime: hours.end,
          isRecurring: true,
          maxConcurrent: existingForDay?.maxConcurrent ?? 1,
          bufferMinutes: existingForDay?.bufferMinutes ?? 15,
          location: location || existingForDay?.location,
          sessionTemplateId: sessionTemplateId || existingForDay?.sessionTemplateId,
        });
      }
      if (Platform.OS !== 'web')
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      logger.info(isEditMode ? 'Bulk availability updated' : 'Setup wizard completed', {
        days: selectedCount,
      });
      onComplete();
    } catch (error) {
      logger.error('Failed to save templates', error);
      Alert.alert('Error', 'Failed to save availability. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [
    isEditMode,
    existingTemplates,
    selectedDays,
    sameHours,
    globalHours,
    perDayHours,
    coachId,
    location,
    sessionTemplateId,
    selectedCount,
    onComplete,
  ]);

  return {
    step,
    setStep,
    selectedDays,
    sameHours,
    globalHours,
    perDayHours,
    location,
    setLocation,
    showLocationInput,
    setShowLocationInput,
    sessionTemplateId,
    saving,
    selectedCount,
    isEditMode,
    totalHoursLive,
    linkedSessionTemplate,
    toggleDay,
    applyPreset,
    getHoursForDay,
    updateDayHours,
    toggleSameHours,
    selectLocation,
    selectSessionTemplate,
    handleConfirm,
  };
}
