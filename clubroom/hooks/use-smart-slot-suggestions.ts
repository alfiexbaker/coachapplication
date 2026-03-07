import { useMemo } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import type { Booking } from '@/constants/app-types';
import { err, ok, serviceError, type ServiceError } from '@/types/result';

export interface SmartSlotSuggestion {
  id: string;
  title: string;
  detail: string;
  impact: string;
}

export function useSmartSlotSuggestions() {
  const { currentUser } = useAuth();
  const coachId = currentUser?.id ?? '';

  const load = async () => {
    if (!coachId) {
      return err(serviceError('UNAUTHORIZED', 'Coach account required.'));
    }

    const bookings = await apiClient.get<Booking[]>(STORAGE_KEYS.BOOKINGS, []);
    const coachBookings = bookings.filter(
      (booking) =>
        booking.coachId === coachId &&
        booking.status !== 'CANCELLED' &&
        typeof booking.scheduledAt === 'string',
    );

    return ok(coachBookings);
  };

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<Booking[]>({
    load,
    deps: [coachId],
    isEmpty: () => false,
    refetchOnFocus: true,
  });

  const suggestions = useMemo<SmartSlotSuggestion[]>(() => {
    const bookings = data ?? [];
    if (bookings.length === 0) {
      return [
        {
          id: 'smart-start',
          title: 'Build your first demand signal',
          detail: 'Smart slot suggestions start after your first confirmed sessions land.',
          impact: 'Complete a few bookings to unlock timing recommendations.',
        },
      ];
    }

    const hourCounts = new Map<number, number>();
    const weekdayCounts = new Map<number, number>();
    const bookedDays = new Set<string>();

    bookings.forEach((booking) => {
      const date = new Date(booking.scheduledAt);
      const hour = date.getHours();
      const weekday = date.getDay();
      hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
      weekdayCounts.set(weekday, (weekdayCounts.get(weekday) ?? 0) + 1);
      bookedDays.add(booking.scheduledAt.split('T')[0]);
    });

    const topHour = [...hourCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    const topWeekday = [...weekdayCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    const avgPerBookedDay = Math.round((bookings.length / Math.max(bookedDays.size, 1)) * 10) / 10;

    const dayName = topWeekday
      ? new Date(2026, 2, 1 + ((topWeekday[0] + 6) % 7)).toLocaleDateString('en-GB', {
          weekday: 'long',
        })
      : 'your busiest day';
    const hourLabel = topHour
      ? new Date(`2026-03-06T${String(topHour[0]).padStart(2, '0')}:00:00`).toLocaleTimeString(
          'en-GB',
          { hour: 'numeric', minute: '2-digit' },
        )
      : 'peak hours';

    return [
      {
        id: 'peak-window',
        title: 'Peak booking window',
        detail: `${dayName} around ${hourLabel} carries your strongest booking density.`,
        impact: 'Keep those slots open first when capacity is tight.',
      },
      {
        id: 'session-density',
        title: 'Session density',
        detail: `You average ${avgPerBookedDay} active session${avgPerBookedDay === 1 ? '' : 's'} on booked days.`,
        impact: 'Use buffer settings to protect turnaround on your busiest days.',
      },
      {
        id: 'volume-trend',
        title: 'Demand signal',
        detail: `${bookings.length} historical booking${bookings.length === 1 ? '' : 's'} are informing current recommendations.`,
        impact: 'The next 5-10 completed sessions will sharpen these suggestions further.',
      },
    ];
  }, [data]);

  return {
    suggestions,
    loading: status === 'loading' && !data,
    status: status as ScreenStatus,
    error: status === 'error' ? ((error as ServiceError | null)?.message ?? 'Failed to load smart slot suggestions.') : null,
    refreshing,
    onRefresh,
    retry,
  };
}
