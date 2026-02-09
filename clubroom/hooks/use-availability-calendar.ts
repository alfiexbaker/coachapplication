/**
 * Hook: useAvailabilityCalendar
 *
 * Manages availability calendar screen state: load templates/overrides/slots,
 * generate calendar days, navigate months, select dates.
 * Used by app/availability/calendar.tsx
 */

import { useState, useEffect, useCallback } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { availabilityService } from '@/services/availability-service';
import type { AvailabilityTemplate, AvailabilityOverride, AvailabilitySlot } from '@/constants/types';
import { createLogger } from '@/utils/logger';
import { toDateStr } from '@/utils/format';

const logger = createLogger('useAvailabilityCalendar');

export const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
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

export function useAvailabilityCalendar() {
  const { currentUser } = useAuth();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [templates, setTemplates] = useState<AvailabilityTemplate[]>([]);
  const [overrides, setOverrides] = useState<AvailabilityOverride[]>([]);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!currentUser?.id) return;

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

      setTemplates(templatesData);
      setOverrides(overridesData);
      setSlots(slotsData);

      logger.debug('Calendar data loaded', {
        templates: templatesData.length,
        overrides: overridesData.length,
        slots: slotsData.length,
      });
    } catch (error) {
      logger.error('Failed to load calendar data', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser?.id, currentMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

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

      const hasTemplate = templates.some(t => t.dayOfWeek === dayOfWeek);
      const override = overrides.find(o => o.date === dateStr);
      const isBlocked = override?.isBlocked ?? false;

      const daySlots = slots.filter(s => s.date === dateStr);
      const bookedSlots = daySlots.filter(s => !s.isAvailable);

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
    setLoading(true);
    setSelectedDate(null);
    setCurrentMonth(prev => {
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

  const selectedSlots = selectedDate
    ? slots.filter(s => s.date === toDateStr(selectedDate))
    : [];

  return {
    currentMonth,
    selectedDate,
    loading,
    refreshing,
    calendarDays,
    selectedSlots,
    setSelectedDate,
    navigateMonth,
    formatTime,
    onRefresh,
  };
}
