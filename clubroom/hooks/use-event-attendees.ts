import { useState, useCallback } from 'react';

import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { eventService } from '@/services/event-service';
import { createLogger } from '@/utils/logger';
import type {
  ClubEvent,
  EventRSVP,
  EventAttendance,
  EventAttendanceStats,
  CheckInInput,
} from '@/constants/types';
import { err, ok, serviceError, type ServiceError } from '@/types/result';
import { uiFeedback } from '@/services/ui-feedback';

const logger = createLogger('useEventAttendees');

interface EventAttendeesData {
  event: ClubEvent | null;
  rsvps: EventRSVP[];
  attendance: EventAttendance[];
  stats: EventAttendanceStats | null;
  currentAttendance: EventAttendance | null;
}

export interface UseEventAttendeesResult {
  event: ClubEvent | null;
  rsvps: EventRSVP[];
  attendance: EventAttendance[];
  stats: EventAttendanceStats | null;
  currentAttendance: EventAttendance | null;
  loading: boolean;
  status: ScreenStatus;
  error: ServiceError | null;
  refreshing: boolean;
  onRefresh: () => void;
  retry: () => void;
  isCoach: boolean;
  isEventToday: boolean;
  checkInAvailable: boolean;
  currentUser: ReturnType<typeof useAuth>['currentUser'];
  handleCheckIn: (input: CheckInInput) => Promise<void>;
  handleUndoCheckIn: () => Promise<void>;
  handleAttendeePress: (userId: string) => void;
  handleExport: () => void;
  handleSendReminder: () => void;
}

export function useEventAttendees(id: string | undefined): UseEventAttendeesResult {
  const { currentUser } = useAuth();
  const isCoach = currentUser?.role === 'COACH';

  const loadData = useCallback(async () => {
    if (!id || !currentUser) {
      return ok<EventAttendeesData>({
        event: null,
        rsvps: [],
        attendance: [],
        stats: null,
        currentAttendance: null,
      });
    }

    try {
      const [eventData, rsvpsData, attendanceData, statsData, userAttendance] = await Promise.all([
        eventService.getEvent(id),
        eventService.getEventRSVPs(id),
        eventService.getAttendeeList(id),
        eventService.getAttendanceStats(id),
        eventService.getUserAttendance(id, currentUser.id),
      ]);

      return ok<EventAttendeesData>({
        event: eventData,
        rsvps: rsvpsData,
        attendance: attendanceData,
        stats: statsData,
        currentAttendance: userAttendance,
      });
    } catch (loadError) {
      logger.error('Failed to load attendee data', loadError);
      return err(
        serviceError('UNKNOWN', 'Failed to load attendees. Pull down to refresh.', loadError),
      );
    }
  }, [id, currentUser]);

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<EventAttendeesData>({
    load: loadData,
    deps: [id, currentUser?.id],
    isEmpty: (value) => value.event === null,
    refetchOnFocus: true,
  });

  const event = data?.event ?? null;
  const rsvps = data?.rsvps ?? [];
  const attendance = data?.attendance ?? [];
  const stats = data?.stats ?? null;
  const currentAttendance = data?.currentAttendance ?? null;
  const loading = status === 'loading';

  const handleCheckIn = useCallback(
    async (input: CheckInInput) => {
      try {
        await eventService.checkIn(input);
        onRefresh();
      } catch (checkInError) {
        logger.error('Failed to check in attendee', checkInError);
        uiFeedback.showToast('Could not complete check-in. Please try again.', 'error');
      }
    },
    [onRefresh],
  );

  const handleUndoCheckIn = useCallback(async () => {
    if (!id || !currentUser) return;
    try {
      await eventService.removeCheckIn(id, currentUser.id);
      onRefresh();
    } catch (undoError) {
      logger.error('Failed to undo check-in', undoError);
      uiFeedback.showToast('Could not undo check-in. Please try again.', 'error');
    }
  }, [id, currentUser, onRefresh]);

  const handleAttendeePress = useCallback((userId: string) => {
    logger.press('AttendeeRow', { userId });
    router.push(Routes.profile(userId));
  }, []);

  const handleExport = useCallback(() => {
    logger.press('ExportAttendees', { eventId: id });
    const names = attendance.map((a) => a.userId).join('\n');
    uiFeedback.alert(
      'Attendee List',
      `${attendance.length} checked in:\n\n${names || 'No attendees yet'}`,
      [{ text: 'OK' }],
    );
  }, [id, attendance]);

  const handleSendReminder = useCallback(() => {
    logger.press('SendReminder', { eventId: id });
    const nonResponders = rsvps.filter((r) => r.status === 'MAYBE').length;
    uiFeedback.alert(
      'Send Reminder',
      nonResponders > 0
        ? `Send reminder to ${nonResponders} people who haven't responded?`
        : 'Everyone has already responded!',
      nonResponders > 0
        ? [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Send', onPress: () => uiFeedback.showToast('Reminders have been sent', 'success') },
          ]
        : [{ text: 'OK' }],
    );
  }, [id, rsvps]);

  const isEventToday = event ? eventService.isEventToday(event) : false;
  const checkInAvailable = event ? eventService.isCheckInAvailable(event) : false;

  return {
    event,
    rsvps,
    attendance,
    stats,
    currentAttendance,
    loading,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    isCoach,
    isEventToday,
    checkInAvailable,
    currentUser,
    handleCheckIn,
    handleUndoCheckIn,
    handleAttendeePress,
    handleExport,
    handleSendReminder,
  };
}
