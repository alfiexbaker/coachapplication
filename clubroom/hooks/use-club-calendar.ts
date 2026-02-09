import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';

import { clubService, type CalendarEvent } from '@/services/club-service';
import { toDateStr } from '@/utils/format';

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export function formatDateKey(year: number, month: number, day: number): string {
  return toDateStr(new Date(year, month, day));
}

export function useClubCalendar() {
  const { clubId } = useLocalSearchParams<{ clubId: string }>();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(now.getDate());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [squads, setSquads] = useState<{ id: string; name: string }[]>([]);
  const [squadFilter, setSquadFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clubId) return;
    setLoading(true);
    (async () => {
      try {
        const [calEvents, calSquads] = await Promise.all([
          clubService.getCalendarEvents(clubId, { year, month, squadId: squadFilter ?? undefined }),
          clubService.getCalendarSquads(clubId),
        ]);
        setEvents(calEvents);
        setSquads(calSquads);
      } catch {
        // handled by service
      } finally {
        setLoading(false);
      }
    })();
  }, [clubId, year, month, squadFilter]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const event of events) {
      if (!map[event.date]) map[event.date] = [];
      map[event.date].push(event);
    }
    return map;
  }, [events]);

  const selectedDateKey = selectedDay !== null ? formatDateKey(year, month, selectedDay) : null;
  const selectedEvents = selectedDateKey ? eventsByDate[selectedDateKey] ?? [] : [];

  // Calendar grid
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfWeek = getFirstDayOfWeek(year, month);
  const totalCells = Math.ceil((daysInMonth + firstDayOfWeek) / 7) * 7;
  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < totalCells; i++) {
    const day = i - firstDayOfWeek + 1;
    calendarCells.push(day >= 1 && day <= daysInMonth ? day : null);
  }
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < calendarCells.length; i += 7) {
    weeks.push(calendarCells.slice(i, i + 7));
  }

  const isToday = useCallback((day: number) =>
    year === now.getFullYear() && month === now.getMonth() && day === now.getDate(),
    [year, month]
  );

  const handlePrevMonth = useCallback(() => {
    setSelectedDay(null);
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else {
      setMonth((m) => m - 1);
    }
  }, [month]);

  const handleNextMonth = useCallback(() => {
    setSelectedDay(null);
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else {
      setMonth((m) => m + 1);
    }
  }, [month]);

  return {
    year, month, selectedDay, setSelectedDay,
    loading, squads, squadFilter, setSquadFilter,
    eventsByDate, selectedEvents, weeks,
    isToday, handlePrevMonth, handleNextMonth,
  };
}
