/**
 * Hook for the Multi-Week Booking screen.
 * Manages week loading from availability, selection, and series booking creation.
 */

import { useState, useEffect, startTransition } from 'react';
import { Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useBookingFlow } from '@/context/booking-flow-context';
import { useAuth } from '@/hooks/use-auth';
import { useChildContext } from '@/hooks/use-child-context';
import { useScreen } from '@/hooks/use-screen';
import { availabilityService } from '@/services/availability-service';
import { multiWeekBookingService } from '@/services/multi-week-booking-service';
import { toDateStr } from '@/utils/format';
import { createLogger } from '@/utils/logger';
import { err, ok, serviceError } from '@/types/result';
import type { WeekRow } from '@/components/bookings/multi-week-picker';
import { uiFeedback } from '@/services/ui-feedback';
import { runAsyncTryCatchFinally } from '@/utils/async-control';
const logger = createLogger('MultiWeekScreen');
export const WEEKS_TO_SHOW = 8;
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const multiWeekSnapshots = new Map<string, WeekRow[]>();
const EMPTY_WEEK_ROWS: WeekRow[] = [];
export function useMultiWeek() {
  const { coachId, weeks: weeksParam } = useLocalSearchParams<{
    coachId: string;
    weeks?: string;
  }>();
  const { currentUser } = useAuth();
  const { children } = useChildContext();
  const { draft } = useBookingFlow();
  const [submitting, setSubmitting] = useState(false);
  const [selectedWeeks, setSelectedWeeks] = useState<Set<string>>(new Set());
  const [showConfirmation, setShowConfirmation] = useState(false);
  const coachName = draft.coachName || 'Coach';
  const sessionType = draft.sessionTypeLabel || draft.sessionType || 'Session';
  const sessionPrice = typeof draft.price === 'number' ? draft.price : 0;
  const sessionDuration = draft.duration ?? 60;
  const snapshotKey = `${coachId}:${sessionDuration}`;
  const requestedWeeks = (() => {
    const parsed = Number.parseInt(weeksParam ?? '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  })();
  const selectedAthlete = (() => {
    const targetId = draft.childId;
    if (targetId) {
      if (currentUser?.id && targetId === currentUser.id) {
        return {
          id: currentUser.id,
          name: draft.athleteName || currentUser.name || currentUser.fullName || 'Athlete',
        };
      }
      const child = children.find((candidate) => candidate.id === targetId);
      if (child) {
        return {
          id: child.id,
          name: child.name,
        };
      }
      return {
        id: targetId,
        name: draft.athleteName || 'Athlete',
      };
    }
    if (currentUser?.id) {
      return {
        id: currentUser.id,
        name: draft.athleteName || currentUser.name || currentUser.fullName || 'Athlete',
      };
    }
    return null;
  })();
  const loadWeeks = async () => {
    if (!coachId) {
      return ok([]);
    }
    try {
      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + WEEKS_TO_SHOW * 7);
      const slots = await availabilityService.getAvailableSlots(
        coachId,
        toDateStr(today),
        toDateStr(endDate),
        sessionDuration,
        {
          applySchedulingRules: true,
        },
      );
      const weekMap = new Map<string, WeekRow>();
      for (const slot of slots) {
        const slotDate = new Date(slot.date + 'T00:00:00');
        const dayOfWeek = slotDate.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(slotDate);
        monday.setDate(slotDate.getDate() + mondayOffset);
        const weekKey = toDateStr(monday);
        if (!weekMap.has(weekKey) || (!weekMap.get(weekKey)!.available && slot.isAvailable)) {
          const dateObj = new Date(slot.date + 'T00:00:00');
          weekMap.set(weekKey, {
            weekDate: slot.date,
            dayName: DAY_NAMES[dateObj.getDay()],
            dateLabel: dateObj.toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
            }),
            startTime: slot.startTime,
            endTime: slot.endTime,
            location: slot.location ?? '',
            price: sessionPrice,
            available: slot.isAvailable,
            unavailableReason: !slot.isAvailable ? 'Fully booked' : undefined,
          });
        }
      }
      const sortedWeeks = Array.from(weekMap.values())
        .sort((a, b) => a.weekDate.localeCompare(b.weekDate))
        .slice(0, WEEKS_TO_SHOW);
      return ok(sortedWeeks);
    } catch (loadError) {
      logger.error('Failed to load weeks', loadError);
      return err(serviceError('UNKNOWN', 'Failed to load multi-week availability.', loadError));
    }
  };
  const { data, status, error, refreshing, onRefresh, retry, colors } = useScreen<WeekRow[]>({
    load: loadWeeks,
    deps: [loadWeeks],
    isEmpty: (rows) => rows.length === 0,
    refetchOnFocus: true,
    loadingStrategy: 'section-skeleton',
  });
  useEffect(() => {
    if (data) {
      multiWeekSnapshots.set(snapshotKey, data);
    }
  }, [data, snapshotKey]);
  const weekRows = data ?? multiWeekSnapshots.get(snapshotKey) ?? EMPTY_WEEK_ROWS;
  useEffect(() => {
    if (weekRows.length === 0) {
      startTransition(() => {
        setSelectedWeeks(new Set());
      });
      return;
    }
    const availableWeeks = weekRows.flatMap((week) => (week.available ? [week.weekDate] : []));
    const initialSelectionCount = requestedWeeks > 0 ? requestedWeeks : 1;
    startTransition(() => {
      setSelectedWeeks(new Set(availableWeeks.slice(0, initialSelectionCount)));
    });
  }, [requestedWeeks, weekRows]);
  const handleToggleWeek = (weekDate: string) => {
    setSelectedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(weekDate)) next.delete(weekDate);
      else next.add(weekDate);
      return next;
    });
  };
  const selectedWeekRows = weekRows.filter((w) => selectedWeeks.has(w.weekDate));
  const primaryLocation = selectedWeekRows[0]?.location ?? '';
  const handleShowConfirmation = () => {
    if (selectedWeeks.size === 0) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowConfirmation(true);
  };
  const handleCancelConfirmation = () => setShowConfirmation(false);
  const handleConfirm = async () => {
    if (!coachId || !currentUser) return;
    if (!selectedAthlete?.id || !selectedAthlete.name) {
      uiFeedback.showToast('Please choose who this booking is for.', 'error');
      return;
    }
    if (selectedWeekRows.length === 0) {
      uiFeedback.showToast('Select at least one week before confirming.');
      return;
    }
    setSubmitting(true);
    await runAsyncTryCatchFinally(
      async () => {
        const result = await multiWeekBookingService.createSeries({
          createdById: currentUser.id,
          createdByName: currentUser.name || currentUser.fullName || 'Parent',
          coachId,
          coachName,
          athleteIds: [selectedAthlete.id],
          athleteNames: [selectedAthlete.name],
          sessionType,
          pricePerSession: sessionPrice,
          selectedWeeks: selectedWeekRows.map((w) => w.weekDate),
          startTime: selectedWeekRows[0]?.startTime ?? draft.slot ?? '10:00',
          duration: sessionDuration,
          location: primaryLocation || draft.locationText || '',
          patternLabel: `${selectedWeekRows.length} weeks`,
          sessionSource: draft.sessionSource,
          sessionSourceEntityId: draft.sessionSourceEntityId,
          clubId: draft.clubId,
          actingAs: draft.actingAs,
          ownerCoachId: draft.ownerCoachId,
          assigneeCoachId: draft.assigneeCoachId,
          createdByUserId: draft.createdByUserId,
          createdByRole: draft.createdByRole,
          notes: draft.notes,
        });
        if (result.success) {
          if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          uiFeedback.showToast(
            `${selectedWeekRows.length} sessions booked successfully!`,
            'success',
          );
          router.back();
        } else {
          uiFeedback.showToast(result.error.message, 'error');
        }
      },
      async (error) => {
        logger.error('Failed to create series', error);
        uiFeedback.showToast('Something went wrong. Please try again.', 'error');
      },
      () => {
        setSubmitting(false);
      },
    );
  };
  return {
    coachId,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    colors,
    loading: status === 'loading' && weekRows.length === 0,
    submitting,
    weeks: weekRows,
    selectedWeeks,
    showConfirmation,
    coachName,
    sessionType,
    selectedWeekRows,
    primaryLocation,
    handleToggleWeek,
    handleShowConfirmation,
    handleCancelConfirmation,
    handleConfirm,
  };
}
