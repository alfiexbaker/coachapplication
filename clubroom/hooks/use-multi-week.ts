/**
 * Hook for the Multi-Week Booking screen.
 * Manages week loading from availability, selection, and series booking creation.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/hooks/use-auth';
import { useScreen } from '@/hooks/use-screen';
import { availabilityService } from '@/services/availability-service';
import { multiWeekBookingService } from '@/services/multi-week-booking-service';
import { toDateStr } from '@/utils/format';
import { createLogger } from '@/utils/logger';
import { err, ok, serviceError } from '@/types/result';
import type { WeekRow } from '@/components/bookings/multi-week-picker';

const logger = createLogger('MultiWeekScreen');

export const WEEKS_TO_SHOW = 8;
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function useMultiWeek() {
  const { coachId } = useLocalSearchParams<{ coachId: string }>();
  const { currentUser } = useAuth();

  const [submitting, setSubmitting] = useState(false);
  const [selectedWeeks, setSelectedWeeks] = useState<Set<string>>(new Set());
  const [showConfirmation, setShowConfirmation] = useState(false);

  const coachName = 'Coach';
  const sessionType = '1:1 Session';
  const defaultPrice = 60;
  const defaultDuration = 60;

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
        defaultDuration,
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
            price: defaultPrice,
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
  }, [coachId, defaultDuration, defaultPrice]);

  const { data, status, error, refreshing, onRefresh, retry, colors } = useScreen<WeekRow[]>({
    load: loadWeeks,
    deps: [loadWeeks],
    isEmpty: (rows) => rows.length === 0,
    refetchOnFocus: true,
  });
  const weeks = data ?? [];

  useEffect(() => {
    if (weeks.length === 0) {
      setSelectedWeeks(new Set());
      return;
    }
    setSelectedWeeks(new Set(weeks.filter((week) => week.available).map((week) => week.weekDate)));
  }, [weeks]);

  const handleToggleWeek = useCallback((weekDate: string) => {
    setSelectedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(weekDate)) next.delete(weekDate);
      else next.add(weekDate);
      return next;
    });
  }, []);

  const selectedWeekRows = useMemo(
    () => weeks.filter((w) => selectedWeeks.has(w.weekDate)),
    [weeks, selectedWeeks],
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
    setSubmitting(true);
    try {
      const result = await multiWeekBookingService.createSeries({
        createdById: currentUser.id,
        createdByName: currentUser.name ?? 'Parent',
        coachId,
        coachName,
        athleteIds: [currentUser.id],
        athleteNames: [currentUser.name ?? 'Athlete'],
        sessionType,
        pricePerSession: defaultPrice,
        selectedWeeks: selectedWeekRows.map((w) => w.weekDate),
        startTime: selectedWeekRows[0]?.startTime ?? '10:00',
        duration: defaultDuration,
        location: primaryLocation,
        patternLabel: `${selectedWeekRows.length} weeks`,
      });
      if (result.success) {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Alert.alert(
          'Booking Confirmed',
          `${selectedWeekRows.length} sessions booked successfully!`,
          [{ text: 'OK', onPress: () => router.back() }],
        );
      } else {
        Alert.alert('Booking Failed', result.error.message);
      }
    } catch (error) {
      logger.error('Failed to create series', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [
    coachId,
    currentUser,
    coachName,
    sessionType,
    defaultPrice,
    selectedWeekRows,
    defaultDuration,
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
    weeks,
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
