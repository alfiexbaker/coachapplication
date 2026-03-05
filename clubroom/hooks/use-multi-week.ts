/**
 * Hook for the Multi-Week Booking screen.
 * Manages week loading from availability, selection, and series booking creation.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
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

const logger = createLogger('MultiWeekScreen');

export const WEEKS_TO_SHOW = 8;
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function useMultiWeek() {
  const { coachId, weeks: weeksParam } = useLocalSearchParams<{ coachId: string; weeks?: string }>();
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
  const requestedWeeks = useMemo(() => {
    const parsed = Number.parseInt(weeksParam ?? '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }, [weeksParam]);
  const selectedAthlete = useMemo(() => {
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
        return { id: child.id, name: child.name };
      }
      return { id: targetId, name: draft.athleteName || 'Athlete' };
    }
    if (currentUser?.id) {
      return {
        id: currentUser.id,
        name: draft.athleteName || currentUser.name || currentUser.fullName || 'Athlete',
      };
    }
    return null;
  }, [children, currentUser, draft.athleteName, draft.childId]);

  const loadWeeks = useCallback(async () => {
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
            dateLabel: dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
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
  }, [coachId, sessionDuration, sessionPrice]);

  const { data, status, error, refreshing, onRefresh, retry, colors } = useScreen<WeekRow[]>({
    load: loadWeeks,
    deps: [loadWeeks],
    isEmpty: (rows) => rows.length === 0,
    refetchOnFocus: true,
  });
  const weekRows = useMemo(() => data ?? [], [data]);

  useEffect(() => {
    if (weekRows.length === 0) {
      setSelectedWeeks(new Set());
      return;
    }
    const availableWeeks = weekRows.filter((week) => week.available).map((week) => week.weekDate);
    const initialSelectionCount = requestedWeeks > 0 ? requestedWeeks : 1;
    setSelectedWeeks(new Set(availableWeeks.slice(0, initialSelectionCount)));
  }, [requestedWeeks, weekRows]);

  const handleToggleWeek = useCallback((weekDate: string) => {
    setSelectedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(weekDate)) next.delete(weekDate);
      else next.add(weekDate);
      return next;
    });
  }, []);

  const selectedWeekRows = useMemo(
    () => weekRows.filter((w) => selectedWeeks.has(w.weekDate)),
    [weekRows, selectedWeeks],
  );
  const primaryLocation = useMemo(() => selectedWeekRows[0]?.location ?? '', [selectedWeekRows]);

  const handleShowConfirmation = useCallback(() => {
    if (selectedWeeks.size === 0) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowConfirmation(true);
  }, [selectedWeeks.size]);

  const handleCancelConfirmation = useCallback(() => setShowConfirmation(false), []);

  const handleConfirm = useCallback(async () => {
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
    try {
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
        uiFeedback.alert(
          'Booking Confirmed',
          `${selectedWeekRows.length} sessions booked successfully!`,
          [{ text: 'OK', onPress: () => router.back() }],
        );
      } else {
        uiFeedback.showToast(result.error.message, 'error');
      }
    } catch (error) {
      logger.error('Failed to create series', error);
      uiFeedback.showToast('Something went wrong. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  }, [
    coachId,
    currentUser,
    coachName,
    draft.actingAs,
    draft.assigneeCoachId,
    draft.clubId,
    draft.createdByRole,
    draft.createdByUserId,
    draft.locationText,
    draft.notes,
    draft.ownerCoachId,
    draft.sessionSource,
    draft.sessionSourceEntityId,
    draft.slot,
    selectedAthlete,
    sessionPrice,
    sessionType,
    selectedWeekRows,
    sessionDuration,
    primaryLocation,
  ]);

  return {
    coachId,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    colors,
    loading: status === 'loading',
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
