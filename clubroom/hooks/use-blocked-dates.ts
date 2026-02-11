/**
 * useBlockedDates — State, effects, handlers for BlockedDatesEditor.
 */
import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { createLogger } from '@/utils/logger';
import { toDateStr } from '@/utils/format';
import type { Booking } from '@/constants/app-types';

const logger = createLogger('BlockedDatesEditor');

export interface BlockedDateRange {
  id: string;
  coachId: string;
  startDate: string;
  endDate: string;
  reason: string;
  createdAt: string;
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function formatDateRange(start: string, end: string): string {
  if (start === end) return formatDate(start);
  return `${formatDate(start)} - ${formatDate(end)}`;
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}

function getWeekRange(): { start: string; end: string } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: toDateStr(monday), end: toDateStr(sunday) };
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function getFirstDayOfMonth(year: number, month: number): number {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

async function getBookingsInRange(
  coachId: string,
  startDate: string,
  endDate: string,
): Promise<{ count: number; dates: string[] }> {
  try {
    const bookings = await apiClient.get<Booking[]>(STORAGE_KEYS.BOOKINGS, []);
    const matching = bookings.filter((b) => {
      if (b.coachId !== coachId) return false;
      if (b.status === 'CANCELLED' || b.status === 'COMPLETED') return false;
      const bookingDate = (b.scheduledAt || b.start || '').split('T')[0];
      return bookingDate >= startDate && bookingDate <= endDate;
    });
    const dates = [...new Set(matching.map((b) => (b.scheduledAt || b.start || '').split('T')[0]))];
    return { count: matching.length, dates };
  } catch {
    return { count: 0, dates: [] };
  }
}

async function loadBlockedDates(coachId: string): Promise<BlockedDateRange[]> {
  try {
    const allBlocked = await apiClient.get<Record<string, BlockedDateRange[]>>(
      STORAGE_KEYS.BLOCKED_DATES,
      {},
    );
    return allBlocked[coachId] || [];
  } catch {
    return [];
  }
}

async function saveBlockedDates(coachId: string, dates: BlockedDateRange[]): Promise<void> {
  const allBlocked = await apiClient.get<Record<string, BlockedDateRange[]>>(
    STORAGE_KEYS.BLOCKED_DATES,
    {},
  );
  allBlocked[coachId] = dates;
  await apiClient.set(STORAGE_KEYS.BLOCKED_DATES, allBlocked);
}

export function useBlockedDates(
  coachId: string,
  onUpdate?: (blockedDates: BlockedDateRange[]) => void,
) {
  const [loading, setLoading] = useState(true);
  const [blockedDates, setBlockedDates] = useState<BlockedDateRange[]>([]);
  const [selectedStart, setSelectedStart] = useState<string | null>(null);
  const [selectedEnd, setSelectedEnd] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [bookingConflict, setBookingConflict] = useState<{ count: number; dates: string[] }>({
    count: 0,
    dates: [],
  });

  useEffect(() => {
    (async () => {
      setBlockedDates(await loadBlockedDates(coachId));
      setLoading(false);
    })();
  }, [coachId]);

  useEffect(() => {
    if (!selectedStart) {
      setBookingConflict({ count: 0, dates: [] });
      return;
    }
    const start = selectedEnd
      ? selectedStart <= (selectedEnd ?? selectedStart)
        ? selectedStart
        : selectedEnd
      : selectedStart;
    const end = selectedEnd
      ? selectedStart <= selectedEnd
        ? selectedEnd
        : selectedStart
      : selectedStart;
    (async () => {
      setBookingConflict(await getBookingsInRange(coachId, start, end));
    })();
  }, [coachId, selectedStart, selectedEnd]);

  const handleDateSelect = useCallback(
    (date: string) => {
      if (!selectedStart || (selectedStart && selectedEnd)) {
        setSelectedStart(date);
        setSelectedEnd(null);
      } else {
        setSelectedEnd(date);
      }
    },
    [selectedStart, selectedEnd],
  );

  const handleAddBlock = useCallback(async () => {
    if (!selectedStart) return;
    const start = selectedEnd && selectedEnd < selectedStart ? selectedEnd : selectedStart;
    const end = selectedEnd
      ? selectedEnd > selectedStart
        ? selectedEnd
        : selectedStart
      : selectedStart;
    const newBlock: BlockedDateRange = {
      id: `block_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      coachId,
      startDate: start,
      endDate: end,
      reason: reason.trim(),
      createdAt: new Date().toISOString(),
    };
    const updated = [...blockedDates, newBlock].sort((a, b) =>
      a.startDate.localeCompare(b.startDate),
    );
    setBlockedDates(updated);
    await saveBlockedDates(coachId, updated);
    setSelectedStart(null);
    setSelectedEnd(null);
    setReason('');
    setBookingConflict({ count: 0, dates: [] });
    onUpdate?.(updated);
    logger.debug('Date range blocked', { start, end });
  }, [coachId, selectedStart, selectedEnd, reason, blockedDates, onUpdate]);

  const doBlockWeek = useCallback(
    async (start: string, end: string) => {
      const newBlock: BlockedDateRange = {
        id: `block_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        coachId,
        startDate: start,
        endDate: end,
        reason: 'Blocked entire week',
        createdAt: new Date().toISOString(),
      };
      const updated = [...blockedDates, newBlock].sort((a, b) =>
        a.startDate.localeCompare(b.startDate),
      );
      setBlockedDates(updated);
      await saveBlockedDates(coachId, updated);
      onUpdate?.(updated);
      logger.debug('Week blocked', { start, end });
    },
    [coachId, blockedDates, onUpdate],
  );

  const handleBlockThisWeek = useCallback(async () => {
    const { start, end } = getWeekRange();
    const conflicts = await getBookingsInRange(coachId, start, end);
    if (conflicts.count > 0) {
      Alert.alert(
        'Bookings exist this week',
        `You have ${conflicts.count} booking${conflicts.count > 1 ? 's' : ''} this week. Blocking will not cancel them. Continue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Block anyway', onPress: () => doBlockWeek(start, end) },
        ],
      );
    } else {
      await doBlockWeek(start, end);
    }
  }, [coachId, doBlockWeek]);

  const handleRemoveBlock = useCallback(
    (blockId: string) => {
      Alert.alert('Remove blocked dates?', 'Sessions will be bookable again for these dates.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const updated = blockedDates.filter((b) => b.id !== blockId);
            setBlockedDates(updated);
            await saveBlockedDates(coachId, updated);
            onUpdate?.(updated);
          },
        },
      ]);
    },
    [coachId, blockedDates, onUpdate],
  );

  const hasSelection = !!selectedStart;
  const selectionLabel = selectedStart
    ? selectedEnd
      ? formatDateRange(
          selectedStart <= selectedEnd ? selectedStart : selectedEnd,
          selectedStart <= selectedEnd ? selectedEnd : selectedStart,
        )
      : formatDate(selectedStart)
    : '';

  return {
    loading,
    blockedDates,
    selectedStart,
    selectedEnd,
    reason,
    setReason,
    bookingConflict,
    hasSelection,
    selectionLabel,
    handleDateSelect,
    handleAddBlock,
    handleBlockThisWeek,
    handleRemoveBlock,
  };
}
