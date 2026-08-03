import { router, useLocalSearchParams } from 'expo-router';

import { Routes } from '@/navigation/routes';
import { useAuth } from '@/hooks/use-auth';
import { useScreen } from '@/hooks/use-screen';
import {
  familyRecurringService,
  type FamilyRecurringPlanSummary,
} from '@/services/family-recurring-service';
import { bookingService } from '@/services/booking';
import { recurringBookingService } from '@/services/recurring-booking-service';
import { err, ok, storageError } from '@/types/result';
import { uiFeedback } from '@/services/ui-feedback';
import { shouldLoadFamilyChildren } from '@/hooks/child-context-helpers';

export function useFamilyRecurring() {
  const { currentUser } = useAuth();
  const params = useLocalSearchParams<{ recurringId?: string }>();
  const canManageFamilyRecurring = shouldLoadFamilyChildren(currentUser);

  const loadPlans = async () => {
    if (!currentUser?.id || !canManageFamilyRecurring) {
      return ok<FamilyRecurringPlanSummary[]>([]);
    }
    return familyRecurringService.listPlansForParent(currentUser.id);
  };

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<FamilyRecurringPlanSummary[]>({
    load: loadPlans,
    deps: [currentUser?.id, canManageFamilyRecurring],
    isEmpty: (plans) => plans.length === 0,
    refetchOnFocus: true,
    loadingStrategy: 'warm-first',
    dataKey: currentUser?.id ? `family-recurring:${currentUser.id}` : 'family-recurring:anonymous',
  });

  const plans = data ?? [];
  const highlightedPlan = typeof params.recurringId === 'string'
    ? plans.find((plan) => plan.recurring.id === params.recurringId)
    : undefined;

  const runAndRefresh = async (action: () => Promise<{ success: boolean; error?: { message?: string } }>, successMessage: string) => {
    if (!canManageFamilyRecurring) return;
    const result = await action();
    if (!result.success) {
      uiFeedback.showToast(result.error?.message || 'Failed to update recurring plan.', 'error');
      return;
    }
    uiFeedback.showToast(successMessage, 'success');
    onRefresh();
  };

  const handlePause = async (recurringId: string, reason?: string) =>
    runAndRefresh(
      () => recurringBookingService.pauseRecurring(recurringId, reason),
      'Recurring plan paused. Existing sessions stay on your calendar.',
    );

  const handleResume = async (recurringId: string) =>
    runAndRefresh(
      () => recurringBookingService.resumeRecurring(recurringId),
      'Recurring plan resumed.',
    );

  const handleCancel = async (recurringId: string, reason?: string) =>
    runAndRefresh(
      () => recurringBookingService.cancelRecurring(recurringId, reason),
      'Recurring plan cancelled. Future recurring sessions have been removed.',
    );

  const handleSkipNext = async (recurringId: string, bookingId: string, reason?: string) =>
    runAndRefresh(async () => {
      const skipped = await bookingService.cancel(
        bookingId,
        reason || 'Skipped from recurring plan',
        'parent',
        { note: `Skipped from recurring plan ${recurringId}` },
      );
      if (!skipped) {
        return err(storageError('Failed to skip the next recurring session.'));
      }
      return ok(skipped);
    }, 'Next recurring session skipped.');

  const handleCreatePlan = () => {
    if (!canManageFamilyRecurring) return;
    router.push(Routes.BOOKINGS_SUBSCRIBE);
  };

  return {
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    canManageFamilyRecurring,
    plans,
    highlightedPlan,
    handlePause,
    handleResume,
    handleCancel,
    handleSkipNext,
    handleCreatePlan,
  };
}
