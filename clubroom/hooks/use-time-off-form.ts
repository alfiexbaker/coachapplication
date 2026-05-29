/**
 * useTimeOffForm — State, effects, and handlers for TimeOffSheet.
 */
import { useState, useEffect, startTransition } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

import { availabilityService } from '@/services/availability-service';
import type { AvailabilityOverride } from '@/constants/types';
import { createLogger } from '@/utils/logger';
import { toDateStr } from '@/utils/format';

import { runAsyncTryCatchFinally } from '@/utils/async-control';

const logger = createLogger('TimeOffSheet');

export type TimeOffStep = 'form' | 'confirm' | 'confirmRemove';

const REASONS = [
  { id: 'holiday', label: 'Holiday', icon: 'airplane-outline' as const },
  { id: 'sick', label: 'Sick Day', icon: 'medical-outline' as const },
  { id: 'personal', label: 'Personal', icon: 'person-outline' as const },
  { id: 'training', label: 'Training', icon: 'school-outline' as const },
  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' as const },
];

export { REASONS };

export function formatDateDisplay(date: Date): string {
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function getDaysBetween(start: Date, end: Date): number {
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

function expandDateRange(start: Date, end: Date): string[] {
  const dates: string[] = [];
  const current = new Date(start);
  while (current <= end) {
    dates.push(toDateStr(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

interface Conflicts {
  bookingCount: number;
  holdCount: number;
  bookings: { id: string; date: string; time: string; athleteName?: string }[];
}

interface UseTimeOffFormParams {
  visible: boolean;
  coachId: string;
  preselectedDate?: string;
  existingOverride?: AvailabilityOverride | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

export function useTimeOffForm({
  visible,
  coachId,
  preselectedDate,
  existingOverride,
  onClose,
  onSaved,
}: UseTimeOffFormParams) {
  const [mode, setMode] = useState<'single' | 'range'>('single');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [reason, setReason] = useState('holiday');
  const [step, setStep] = useState<TimeOffStep>('form');
  const [conflicts, setConflicts] = useState<Conflicts | null>(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  const hapticTap = () => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  useEffect(() => {
    if (visible) {
      if (preselectedDate) {
        const d = new Date(preselectedDate + 'T12:00:00');
        startTransition(() => {
          setStartDate(d);
        });
        startTransition(() => {
          setEndDate(d);
        });
        startTransition(() => {
          setMode('single');
        });
      } else {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        startTransition(() => {
          setStartDate(tomorrow);
        });
        startTransition(() => {
          setEndDate(tomorrow);
        });
        startTransition(() => {
          setMode('single');
        });
      }
      if (existingOverride?.reason) {
        const match = REASONS.find(
          (r) => r.label === existingOverride.reason || r.id === existingOverride.reason,
        );
        startTransition(() => {
          setReason(match?.id || 'holiday');
        });
      } else {
        startTransition(() => {
          setReason('holiday');
        });
      }
      startTransition(() => {
        setStep('form');
      });
      startTransition(() => {
        setConflicts(null);
      });
      startTransition(() => {
        setRemoving(false);
      });
    }
  }, [visible, preselectedDate, existingOverride]);

  const isSameDay = toDateStr(startDate) === toDateStr(endDate);
  const dayCount = getDaysBetween(startDate, endDate);
  const isEditing = !!existingOverride;

  const adjustDate = (target: 'start' | 'end', days: number) => {
    hapticTap();
    if (target === 'start') {
      setStartDate((prev) => {
        const newDate = new Date(prev);
        newDate.setDate(newDate.getDate() + days);
        setEndDate((prevEnd) => (newDate > prevEnd ? newDate : prevEnd));
        return newDate;
      });
    } else {
      setEndDate((prev) => {
        const newDate = new Date(prev);
        newDate.setDate(newDate.getDate() + days);
        return newDate >= startDate ? newDate : prev;
      });
    }
  };

  const handleCheckConflicts = async () => {
    hapticTap();
    setChecking(true);

    await runAsyncTryCatchFinally(
      async () => {
        const dates = expandDateRange(startDate, endDate);
        const result = await availabilityService.checkConflicts(coachId, dates);
        setConflicts(result);
        setStep('confirm');
      },
      async (error) => {
        logger.error('Failed to check conflicts', error);
      },
      () => {
        setChecking(false);
      },
    );
  };

  const handleSave = async () => {
    setSaving(true);

    await runAsyncTryCatchFinally(
      async () => {
        const dates = expandDateRange(startDate, endDate);
        const reasonLabel = REASONS.find((r) => r.id === reason)?.label || reason;
        await Promise.all(
          dates.map((date) => availabilityService.blockDate(coachId, date, reasonLabel)),
        );
        if (Platform.OS !== 'web')
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onClose();
        await Promise.resolve(onSaved()).catch((e: unknown) =>
          logger.warn('Post-save refresh failed', e),
        );
      },
      async (error) => {
        logger.error('Failed to save time off', error);
      },
      () => {
        setSaving(false);
      },
    );
  };

  const handleRemoveConfirm = async () => {
    if (!existingOverride) return;
    setRemoving(true);
    try {
      await availabilityService.unblockDate(coachId, existingOverride.date);
      if (Platform.OS !== 'web')
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
      await Promise.resolve(onSaved()).catch((e: unknown) =>
        logger.warn('Post-removal refresh failed', e),
      );
    } catch (error) {
      logger.error('Failed to remove time off', error);
      setRemoving(false);
      setStep('form');
    }
  };

  const handleClose = () => {
    if (removing) return;
    setStep('form');
    setConflicts(null);
    onClose();
  };

  const selectMode = (m: 'single' | 'range') => {
    hapticTap();
    setMode(m);
    if (m === 'single') setEndDate(startDate);
  };

  const goToStep = (s: TimeOffStep) => {
    hapticTap();
    setStep(s);
  };

  const quickDates = (() => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + ((8 - today.getDay()) % 7 || 7));
    return [
      { label: 'Tomorrow', date: tomorrow },
      { label: 'Next Mon', date: nextMonday },
    ];
  })();

  const selectQuickDate = (date: Date) => {
    hapticTap();
    setStartDate(date);
    setEndDate(date);
  };

  const selectReason = (id: string) => {
    hapticTap();
    setReason(id);
  };

  const removeDate = existingOverride
    ? formatDateDisplay(new Date(existingOverride.date + 'T12:00:00'))
    : '';

  return {
    mode,
    startDate,
    endDate,
    reason,
    step,
    conflicts,
    checking,
    saving,
    removing,
    isSameDay,
    dayCount,
    isEditing,
    quickDates,
    removeDate,
    existingOverride,
    adjustDate,
    handleCheckConflicts,
    handleSave,
    handleRemoveConfirm,
    handleClose,
    selectMode,
    goToStep,
    selectQuickDate,
    selectReason,
  };
}
