/**
 * Hook: useSchedulingRules
 *
 * Manages coach scheduling rules state: load, edit, save.
 * Used by app/availability/scheduling-rules.tsx
 */

import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useAuth } from '@/hooks/use-auth';
import { useScreen } from '@/hooks/use-screen';
import { schedulingRulesService } from '@/services/scheduling-rules-service';
import type { CoachSchedulingRules } from '@/constants/types';
import { createLogger } from '@/utils/logger';
import { err, ok, serviceError, type ServiceError } from '@/types/result';

const logger = createLogger('useSchedulingRules');

// Pre-defined options for notice period
export const NOTICE_OPTIONS = [
  { value: 0, label: 'No minimum', description: 'Allow immediate bookings' },
  { value: 2, label: '2 hours', description: 'Gives you a heads up' },
  { value: 6, label: '6 hours', description: 'Half day notice' },
  { value: 24, label: '24 hours', description: 'A full day ahead' },
  { value: 48, label: '48 hours', description: 'Two days notice' },
  { value: 72, label: '3 days', description: 'More prep time' },
];

// Buffer time options
export const BUFFER_OPTIONS = [
  { value: 0, label: 'No buffer', description: 'Back-to-back sessions' },
  { value: 10, label: '10 mins', description: 'Quick break' },
  { value: 15, label: '15 mins', description: 'Standard break' },
  { value: 30, label: '30 mins', description: 'Time to reset' },
  { value: 45, label: '45 mins', description: 'Extended break' },
  { value: 60, label: '1 hour', description: 'Full hour between' },
];

// Max advance booking options
export const ADVANCE_BOOKING_OPTIONS = [
  { value: 7, label: '1 week', description: '7 days ahead' },
  { value: 14, label: '2 weeks', description: '14 days ahead' },
  { value: 30, label: '1 month', description: '30 days ahead' },
  { value: 60, label: '2 months', description: '60 days ahead' },
  { value: 90, label: '3 months', description: '90 days ahead' },
];

// Reschedule deadline options
export const RESCHEDULE_OPTIONS = [
  { value: 2, label: '2 hours before', description: 'Very flexible' },
  { value: 6, label: '6 hours before', description: 'Same-day changes OK' },
  { value: 24, label: '24 hours before', description: 'Day before cutoff' },
  { value: 48, label: '48 hours before', description: 'Two-day notice' },
];

export function useSchedulingRules() {
  const { currentUser } = useAuth();

  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Form state
  const [minimumAdvanceHours, setMinimumAdvanceHours] = useState(24);
  const [maxAdvanceDays, setMaxAdvanceDays] = useState(30);
  const [bufferMinutes, setBufferMinutes] = useState(15);
  const [allowSameDayBookings, setAllowSameDayBookings] = useState(true);
  const [allowRescheduling, setAllowRescheduling] = useState(true);
  const [rescheduleDeadlineHours, setRescheduleDeadlineHours] = useState(24);

  const coachId = currentUser?.id || 'coach_1';

  const loadRules = useCallback(async () => {
    try {
      const dataResult = await schedulingRulesService.getCoachRules(coachId);
      if (dataResult.success) {
        return ok<CoachSchedulingRules>(dataResult.data);
      } else {
        logger.error('Failed to load scheduling rules', dataResult.error);
        return err(serviceError('UNKNOWN', 'Failed to load scheduling rules.', dataResult.error));
      }
    } catch (error) {
      logger.error('Failed to load scheduling rules', error);
      return err(serviceError('UNKNOWN', 'Failed to load scheduling rules.', error));
    }
  }, [coachId]);

  const {
    data,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
  } = useScreen<CoachSchedulingRules>({
    load: loadRules,
    deps: [coachId],
    isEmpty: () => false,
    refetchOnFocus: true,
  });

  useEffect(() => {
    if (!data) return;
    setMinimumAdvanceHours(data.minimumAdvanceBookingHours);
    setMaxAdvanceDays(data.maxAdvanceBookingDays);
    setBufferMinutes(data.bufferMinutesDefault);
    setAllowSameDayBookings(data.allowSameDayBookings);
    setAllowRescheduling(data.allowRescheduling);
    setRescheduleDeadlineHours(data.rescheduleDeadlineHours);
  }, [data]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const saveResult = await schedulingRulesService.updateCoachRules(coachId, {
        minimumAdvanceBookingHours: minimumAdvanceHours,
        maxAdvanceBookingDays: maxAdvanceDays,
        bufferMinutesDefault: bufferMinutes,
        maxConcurrentDefault: 1,
        allowSameDayBookings,
        allowRescheduling,
        rescheduleDeadlineHours,
      });
      if (!saveResult.success) {
        logger.error('Failed to save scheduling rules', saveResult.error);
        Alert.alert('Error', 'Failed to save scheduling rules. Please try again.');
        return;
      }

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setHasChanges(false);
      Alert.alert('Saved', 'Your scheduling rules have been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      logger.error('Failed to save scheduling rules', error);
      Alert.alert('Error', 'Failed to save scheduling rules. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [coachId, minimumAdvanceHours, maxAdvanceDays, bufferMinutes, allowSameDayBookings, allowRescheduling, rescheduleDeadlineHours]);

  const updateField = useCallback(<T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setHasChanges(true);
  }, []);

  const handleBack = useCallback(() => {
    if (hasChanges) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Are you sure you want to leave?',
        [
          { text: 'Stay', style: 'cancel' },
          { text: 'Leave', style: 'destructive', onPress: () => router.back() },
        ]
      );
    } else {
      router.back();
    }
  }, [hasChanges]);

  return {
    status,
    error: status === 'error' ? (error as ServiceError | null) : null,
    loading: status === 'loading',
    refreshing,
    onRefresh,
    retry,
    saving,
    hasChanges,
    minimumAdvanceHours,
    maxAdvanceDays,
    bufferMinutes,
    allowSameDayBookings,
    allowRescheduling,
    rescheduleDeadlineHours,
    setMinimumAdvanceHours,
    setMaxAdvanceDays,
    setBufferMinutes,
    setAllowSameDayBookings,
    setAllowRescheduling,
    setRescheduleDeadlineHours,
    handleSave,
    updateField,
    handleBack,
  };
}
