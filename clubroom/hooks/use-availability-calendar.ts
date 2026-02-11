/**
 * Hook: useAvailabilityCalendar
 *
 * Manages availability calendar screen state: load templates/overrides/slots,
 * generate calendar days, navigate months, select dates.
 * Used by app/availability/calendar.tsx
 */

import { useState, useCallback } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useScreen } from '@/hooks/use-screen';
import { availabilityService } from '@/services/availability-service';
import type {
  AvailabilityTemplate,
  AvailabilityOverride,
  AvailabilitySlot,
} from '@/constants/types';
import { createLogger } from '@/utils/logger';
import { toDateStr } from '@/utils/format';
import { err, ok, serviceError, type ServiceError } from '@/types/result';

const logger = createLogger('useAvailabilityCalendar');

export const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export interface CalendarDay {
  date: Date;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  hasAvailability: boolean;
  isBlocked: boolean;
  bookingCount: number;
  slots: AvailabilitySlot[];
}

interface AvailabilityCalendarData {
  templates: AvailabilityTemplate[];
  overrides: AvailabilityOverride[];
  slots: AvailabilitySlot[];
}

export function useAvailabilityCalendar() {
  const { currentUser } = useAuth();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const loadData = useCallback(async () => {
    if (!currentUser?.id) {
      return ok<AvailabilityCalendarData>({
        templates: [],
        overrides: [],
        slots: [],
      });
    }

    try {
      const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      const startDate = new Date(firstDay);
      startDate.setDate(startDate.getDate() - firstDay.getDay());

      const endDate = new Date(lastDay);
      endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));

      const startStr = toDateStr(startDate);
      const endStr = toDateStr(endDate);

      const [templatesData, overridesData, slotsData] = await Promise.all([
        availabilityService.getTemplates(currentUser.id),
        availabilityService.getOverrides(currentUser.id, startStr, endStr),
        availabilityService.getAvailableSlots(currentUser.id, startStr, endStr),
      ]);

      logger.debug('Calendar data loaded', {
        templates: templatesData.length,
        overrides: overridesData.length,
        slots: slotsData.length,
      });

      return ok<AvailabilityCalendarData>({
        templates: templatesData,
        overrides: overridesData,
        slots: slotsData,
      });
    } catch (error) {
      logger.error('Failed to load calendar data', error);
      return err(serviceError('UNKNOWN', 'Failed to load availability calendar.', error));
    }
  }, [currentUser?.id, currentMonth]);

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<AvailabilityCalendarData>(
    {
      load: loadData,
      deps: [currentUser?.id, currentMonth.getFullYear(), currentMonth.getMonth()],
      isEmpty: (value) =>
        value.templates.length === 0 && value.overrides.length === 0 && value.slots.length === 0,
      refetchOnFocus: true,
    },
  );

  const templates = data?.templates ?? [];
  const overrides = data?.overrides ?? [];
  const slots = data?.slots ?? [];

  const generateCalendarDays = useCallback((): CalendarDay[] => {
    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));

    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dateStr = toDateStr(date);
      const dayOfWeek = date.getDay();

      const hasTemplate = templates.some((t) => t.dayOfWeek === dayOfWeek);
      const override = overrides.find((o) => o.date === dateStr);
      const isBlocked = override?.isBlocked ?? false;

      const daySlots = slots.filter((s) => s.date === dateStr);
      const bookedSlots = daySlots.filter((s) => !s.isAvailable);

      days.push({
        date: new Date(date),
        dayOfMonth: date.getDate(),
        isCurrentMonth: date.getMonth() === currentMonth.getMonth(),
        isToday: date.getTime() === today.getTime(),
        hasAvailability: hasTemplate && !isBlocked,
        isBlocked,
        bookingCount: bookedSlots.length,
        slots: daySlots,
      });
    }

    return days;
  }, [currentMonth, templates, overrides, slots]);

  const calendarDays = generateCalendarDays();

  const navigateMonth = useCallback((direction: number) => {
    setSelectedDate(null);
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
  }, []);

  const formatTime = useCallback((time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  }, []);

  const selectedSlots = selectedDate ? slots.filter((s) => s.date === toDateStr(selectedDate)) : [];

  return {
    currentMonth,
    selectedDate,
    status,
    error: status === 'error' ? (error as ServiceError | null) : null,
    loading: status === 'loading',
    refreshing,
    calendarDays,
    selectedSlots,
    setSelectedDate,
    navigateMonth,
    formatTime,
    onRefresh,
    retry,
  };
}
