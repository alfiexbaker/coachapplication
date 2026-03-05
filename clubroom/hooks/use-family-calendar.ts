import { useState, useCallback, useMemo } from 'react';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { useAuth } from '@/hooks/use-auth';
import { useScreen } from '@/hooks/use-screen';
import { createLogger } from '@/utils/logger';
import {
  familyService,
  type FamilyMember,
  type FamilyCalendarEvent,
  type FamilyDateRange,
} from '@/services/family';
import { eventService } from '@/services/event-service';
import { err, ok, serviceError, type ServiceError } from '@/types/result';

const logger = createLogger('FamilyCalendarScreen');

interface FamilyCalendarData {
  members: FamilyMember[];
  events: FamilyCalendarEvent[];
}

export function useFamilyCalendar() {
  const { currentUser } = useAuth();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [dateRange, _setDateRange] = useState<FamilyDateRange>(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    return {
      startDate: startOfMonth.toISOString(),
      endDate: endOfMonth.toISOString(),
    };
  });

  const loadData = useCallback(async () => {
    if (!currentUser?.id) {
      return ok<FamilyCalendarData>({ members: [], events: [] });
    }

    try {
      const [membersData, bookingsData, clubEventsData] = await Promise.all([
        familyService.getFamilyMembers(currentUser.id),
        familyService.getFamilyCalendar(currentUser.id, dateRange),
        eventService.getEventsForCalendar(currentUser.id, dateRange.startDate, dateRange.endDate),
      ]);

      const clubEventsAsCalendar: FamilyCalendarEvent[] = clubEventsData.map((event) => ({
        id: event.id,
        title: event.title,
        start: `${event.date}T${event.startTime}`,
        end: `${event.date}T${event.endTime}`,
        status: 'CONFIRMED' as const,
        childId: '',
        childName: 'Club Event',
        colorCode: '#6366F1',
        coachId: '',
        coachName: event.location,
        location: event.location,
        price: 0,
        type: 'EVENT' as const,
        eventType: event.eventType,
      }));

      const allEvents = [...bookingsData, ...clubEventsAsCalendar].sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
      );

      return ok<FamilyCalendarData>({
        members: membersData,
        events: allEvents,
      });
    } catch (error) {
      logger.error('Failed to load calendar data:', error);
      return err(serviceError('UNKNOWN', 'Failed to load family calendar.', error));
    }
  }, [currentUser?.id, dateRange]);

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<FamilyCalendarData>({
    load: loadData,
    deps: [currentUser?.id, dateRange.startDate, dateRange.endDate],
    isEmpty: (value) => value.events.length === 0,
    refetchOnFocus: true,
  });

  const members = data?.members ?? [];
  const events = data?.events ?? [];

  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date);
  }, []);

  const handleEventPress = useCallback((event: FamilyCalendarEvent) => {
    if ((event as FamilyCalendarEvent & { type?: string }).type === 'EVENT') {
      router.push(Routes.event(event.id));
    } else {
      router.push(
        Routes.booking(event.id, { returnTo: Routes.FAMILY_CALENDAR as string }),
      );
    }
  }, []);

  const handleChildFilterChange = useCallback((childId: string | null) => {
    setSelectedChildId(childId);
  }, []);

  const monthStats = useMemo(
    () => ({
      totalSessions: events.filter(
        (e) =>
          (e.status === 'CONFIRMED' || e.status === 'PENDING') &&
          (!selectedChildId || e.childId === selectedChildId),
      ).length,
      completedSessions: events.filter(
        (e) => e.status === 'COMPLETED' && (!selectedChildId || e.childId === selectedChildId),
      ).length,
    }),
    [events, selectedChildId],
  );

  return {
    status,
    error: status === 'error' ? (error as ServiceError | null) : null,
    loading: status === 'loading',
    refreshing,
    onRefresh,
    retry,
    members,
    events,
    selectedDate,
    selectedChildId,
    monthStats,
    handleDateSelect,
    handleEventPress,
    handleChildFilterChange,
  };
}
