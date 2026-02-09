import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { useAuth } from '@/hooks/use-auth';
import { eventService } from '@/services/event-service';
import { createLogger } from '@/utils/logger';
import type { ClubEvent, EventRSVP, EventAttendance, EventAttendanceStats, CheckInInput } from '@/constants/types';

const logger = createLogger('useAttendees');

export function useAttendees() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentUser } = useAuth();
  const isCoach = currentUser?.role === 'COACH';

  const [event, setEvent] = useState<ClubEvent | null>(null);
  const [rsvps, setRSVPs] = useState<EventRSVP[]>([]);
  const [attendance, setAttendance] = useState<EventAttendance[]>([]);
  const [stats, setStats] = useState<EventAttendanceStats | null>(null);
  const [currentAttendance, setCurrentAttendance] = useState<EventAttendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!id || !currentUser) return;
    try {
      const [eventData, rsvpsData, attendanceData, statsData, userAttendance] = await Promise.all([
        eventService.getEvent(id),
        eventService.getEventRSVPs(id),
        eventService.getAttendeeList(id),
        eventService.getAttendanceStats(id),
        eventService.getUserAttendance(id, currentUser.id),
      ]);
      setEvent(eventData);
      setRSVPs(rsvpsData);
      setAttendance(attendanceData);
      setStats(statsData);
      setCurrentAttendance(userAttendance);
    } catch (error) {
      logger.error('Failed to load attendee data', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, currentUser]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleCheckIn = useCallback(async (input: CheckInInput) => {
    await eventService.checkIn(input);
    await loadData();
  }, [loadData]);

  const handleUndoCheckIn = useCallback(async () => {
    if (!id || !currentUser) return;
    await eventService.removeCheckIn(id, currentUser.id);
    await loadData();
  }, [id, currentUser, loadData]);

  const handleAttendeePress = useCallback((userId: string) => {
    logger.press('AttendeeRow', { userId });
    router.push(Routes.profile(userId));
  }, []);

  const handleExportAttendees = useCallback(() => {
    logger.press('ExportAttendees', { eventId: id });
    const attendeeNames = attendance.map((a) => a.userName).join('\n');
    Alert.alert('Attendee List', `${attendance.length} checked in:\n\n${attendeeNames || 'No attendees yet'}`, [{ text: 'OK' }]);
  }, [id, attendance]);

  const handleSendReminder = useCallback(() => {
    logger.press('SendReminder', { eventId: id });
    const nonResponders = rsvps.filter((r) => r.status === 'MAYBE').length;
    Alert.alert(
      'Send Reminder',
      nonResponders > 0 ? `Send reminder to ${nonResponders} people who haven't responded?` : 'Everyone has already responded!',
      nonResponders > 0
        ? [{ text: 'Cancel', style: 'cancel' }, { text: 'Send', onPress: () => Alert.alert('Sent', 'Reminders have been sent') }]
        : [{ text: 'OK' }],
    );
  }, [id, rsvps]);

  const isEventToday = event ? eventService.isEventToday(event) : false;
  const checkInAvailable = event ? eventService.isCheckInAvailable(event) : false;

  return {
    event, rsvps, attendance, stats, currentAttendance, loading, refreshing,
    isCoach, isEventToday, checkInAvailable, currentUser,
    handleCheckIn, handleUndoCheckIn, handleAttendeePress,
    handleExportAttendees, handleSendReminder,
  };
}
