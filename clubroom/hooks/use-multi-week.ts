/**
 * Hook for the Multi-Week Booking screen.
 * Manages week loading from availability, selection, and series booking creation.
 */

import { useCallback, useState, useEffect, useRef, startTransition } from 'react';
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
import { resolveSingleBookingDraftTarget } from '@/utils/booking-targets';
import { resolveUserProfileName } from '@/utils/person-name';
import { err, ok, serviceError } from '@/types/result';
import type { WeekRow } from '@/components/bookings/multi-week-picker';
import { uiFeedback } from '@/services/ui-feedback';
import { runAsyncTryCatchFinally } from '@/utils/async-control';
import { resolveAuthoritativeScreenState } from '@/hooks/use-authoritative-screen-state';
import { selectRecurringWeekSlots } from '@/utils/multi-week-availability';
const logger = createLogger('MultiWeekScreen');
export const WEEKS_TO_SHOW = 8;
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
  const selectionSeedKeyRef = useRef<string | null>(null);
  const coachName = draft.coachName || 'Coach';
  const sessionType = draft.sessionTypeLabel || draft.sessionType || 'Session';
  const sessionPrice =
    typeof draft.price === 'number' && Number.isFinite(draft.price) ? draft.price : 0;
  const sessionDuration = draft.duration ?? 60;
  const preferredLocation = draft.locationText?.trim();
  const availabilityKey = `${coachId}:${sessionDuration}:${sessionPrice}:${draft.date ?? ''}:${draft.slot ?? ''}:${preferredLocation ?? ''}`;
  const requestedWeeks = (() => {
    const parsed = Number.parseInt(weeksParam ?? '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  })();
  const selectedAthlete = resolveSingleBookingDraftTarget({ draft, currentUser, children });
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
        {
          applySchedulingRules: true,
        },
      );
      return ok(
        selectRecurringWeekSlots(slots, sessionPrice, WEEKS_TO_SHOW, {
          date: draft.date,
          startTime: draft.slot,
          location: preferredLocation,
        }),
      );
    } catch (loadError) {
      logger.error('Failed to load weeks', loadError);
      return err(serviceError('UNKNOWN', 'Failed to load multi-week availability.', loadError));
    }
  }, [coachId, draft.date, draft.slot, preferredLocation, sessionDuration, sessionPrice]);
  const {
    data,
    status,
    error,
    silentError,
    refreshing,
    onRefresh,
    retry,
    colors,
    isPending,
    hasRequestedTruthfulFrame,
  } = useScreen<WeekRow[]>({
    load: loadWeeks,
    deps: [loadWeeks],
    isEmpty: (rows) => rows.length === 0,
    refetchOnFocus: true,
    loadingStrategy: 'section-skeleton',
    dataKey: availabilityKey,
  });
  const { blocked: availabilityBlocked, status: visibleStatus } = resolveAuthoritativeScreenState({
    status,
    isPending,
    hasRequestedTruthfulFrame,
    hasSilentError: Boolean(silentError),
  });
  const weekRows = availabilityBlocked ? EMPTY_WEEK_ROWS : (data ?? EMPTY_WEEK_ROWS);
  const selectionSeedKey = `${availabilityKey}:${requestedWeeks}`;
  useEffect(() => {
    if (weekRows.length === 0) {
      selectionSeedKeyRef.current = null;
      startTransition(() => {
        setSelectedWeeks((current) => (current.size === 0 ? current : new Set()));
      });
      return;
    }
    const availableWeeks = weekRows.flatMap((week) => (week.available ? [week.weekDate] : []));
    if (selectionSeedKeyRef.current !== selectionSeedKey) {
      selectionSeedKeyRef.current = selectionSeedKey;
      const initialSelectionCount = requestedWeeks > 0 ? requestedWeeks : 1;
      startTransition(() => {
        setSelectedWeeks(new Set(availableWeeks.slice(0, initialSelectionCount)));
      });
      return;
    }
    const availableWeekSet = new Set(availableWeeks);
    startTransition(() => {
      setSelectedWeeks((current) => {
        const next = new Set([...current].filter((weekDate) => availableWeekSet.has(weekDate)));
        return next.size === current.size ? current : next;
      });
    });
  }, [requestedWeeks, selectionSeedKey, weekRows]);
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
    if (availabilityBlocked || selectedWeekRows.length === 0) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowConfirmation(true);
  };
  const handleCancelConfirmation = () => setShowConfirmation(false);
  const handleConfirm = async () => {
    if (!coachId || !currentUser) return;
    if (availabilityBlocked) {
      uiFeedback.showToast('Refresh availability before booking these weeks.', 'error');
      return;
    }
    const selectedAthleteName = selectedAthlete?.name;
    if (!selectedAthlete?.id || !selectedAthleteName) {
      uiFeedback.showToast('Please choose who this booking is for.', 'error');
      return;
    }
    const createdByName = resolveUserProfileName(currentUser);
    if (!createdByName) {
      uiFeedback.showToast(
        'Your account name is missing. Update your profile before booking.',
        'error',
      );
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
          createdByName,
          coachId,
          coachName,
          athleteIds: [selectedAthlete.id],
          athleteNames: [selectedAthleteName],
          sessionType,
          pricePerSession: sessionPrice,
          selectedWeeks: selectedWeekRows.map((w) => w.weekDate),
          startTime: selectedWeekRows[0]?.startTime ?? draft.slot ?? '10:00',
          duration: sessionDuration,
          location: preferredLocation || primaryLocation,
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
    status: visibleStatus,
    error: error ?? silentError,
    refreshing,
    onRefresh,
    retry,
    colors,
    loading: visibleStatus === 'loading' && weekRows.length === 0,
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
