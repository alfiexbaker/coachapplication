import type { AvailabilitySlot } from '@/constants/session-types';
import { toDateStr } from '@/utils/format';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export interface MultiWeekSlotRow {
  weekDate: string;
  dayName: string;
  dateLabel: string;
  startTime: string;
  endTime: string;
  location: string;
  price: number;
  available: boolean;
  unavailableReason?: string;
}

export interface RecurringSlotPreference {
  date?: string;
  startTime?: string;
  location?: string;
}

interface RecurringSlotCandidate {
  key: string;
  slotsByWeek: Map<string, AvailabilitySlot>;
}

function weekStartFor(date: Date): string {
  const monday = new Date(date);
  const mondayOffset = date.getDay() === 0 ? -6 : 1 - date.getDay();
  monday.setDate(date.getDate() + mondayOffset);
  return toDateStr(monday);
}

function recurringSlotKey(slot: AvailabilitySlot, date: Date): string {
  return [date.getDay(), slot.startTime, slot.endTime, slot.location ?? ''].join('|');
}

function compareCandidates(a: RecurringSlotCandidate, b: RecurringSlotCandidate): number {
  const availableWeeks = (candidate: RecurringSlotCandidate) =>
    [...candidate.slotsByWeek.values()].filter((slot) => slot.isAvailable).length;
  const availabilityDifference = availableWeeks(b) - availableWeeks(a);
  if (availabilityDifference !== 0) return availabilityDifference;

  const firstDate = (candidate: RecurringSlotCandidate) =>
    [...candidate.slotsByWeek.values()]
      .filter((slot) => slot.isAvailable)
      .map((slot) => slot.date)
      .sort()[0] ?? '';
  const firstDateDifference = firstDate(a).localeCompare(firstDate(b));
  if (firstDateDifference !== 0) return firstDateDifference;

  return a.key.localeCompare(b.key);
}

/**
 * Choose one coherent weekly slot for the compact multi-week flow. The API's
 * series contract accepts one time and one location, so every returned row
 * must share those values rather than mixing the first open slot from each
 * calendar week.
 */
export function selectRecurringWeekSlots(
  slots: AvailabilitySlot[],
  price: number,
  maximumWeeks: number,
  preference: RecurringSlotPreference = {},
): MultiWeekSlotRow[] {
  const candidates = new Map<string, RecurringSlotCandidate>();

  for (const slot of slots) {
    const date = new Date(`${slot.date}T00:00:00`);
    if (Number.isNaN(date.getTime())) continue;

    const key = recurringSlotKey(slot, date);
    const candidate = candidates.get(key) ?? { key, slotsByWeek: new Map() };
    const weekKey = weekStartFor(date);
    const existing = candidate.slotsByWeek.get(weekKey);
    if (!existing || (!existing.isAvailable && slot.isAvailable)) {
      candidate.slotsByWeek.set(weekKey, slot);
    }
    candidates.set(key, candidate);
  }

  const preferredDate = preference.date ? new Date(`${preference.date}T00:00:00`) : null;
  const preferredDay =
    preferredDate && !Number.isNaN(preferredDate.getTime()) ? preferredDate.getDay() : undefined;
  const matchingCandidates = [...candidates.values()].filter((candidate) =>
    [...candidate.slotsByWeek.values()].some((slot) => {
      const date = new Date(`${slot.date}T00:00:00`);
      return (
        (preferredDay === undefined || date.getDay() === preferredDay) &&
        (!preference.startTime || slot.startTime === preference.startTime)
      );
    }),
  );
  const selectedCandidate = matchingCandidates.sort(compareCandidates)[0];
  if (!selectedCandidate) return [];

  return [...selectedCandidate.slotsByWeek.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, maximumWeeks)
    .map((slot) => {
      const date = new Date(`${slot.date}T00:00:00`);
      return {
        weekDate: slot.date,
        dayName: DAY_NAMES[date.getDay()],
        dateLabel: date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        startTime: slot.startTime,
        endTime: slot.endTime,
        location: preference.location?.trim() || slot.location || '',
        price,
        available: slot.isAvailable,
        unavailableReason: slot.isAvailable ? undefined : 'No longer available',
      };
    });
}
