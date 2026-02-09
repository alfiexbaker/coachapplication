/**
 * BlockDateModal — Constants, date helpers, and presets.
 */

export const BLOCK_REASONS = [
  { id: 'holiday', label: 'Holiday / Vacation', icon: 'airplane-outline' },
  { id: 'personal', label: 'Personal Day', icon: 'person-outline' },
  { id: 'illness', label: 'Illness', icon: 'medical-outline' },
  { id: 'training', label: 'Coach Training', icon: 'school-outline' },
  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
] as const;

function getChristmasWeek(): { start: Date; end: Date } {
  const year = new Date().getFullYear();
  return { start: new Date(year, 11, 23), end: new Date(year, 11, 31) };
}

function getEasterWeekend(): { start: Date; end: Date } {
  const year = new Date().getFullYear();
  const easter = year === 2024 ? new Date(2024, 2, 29) : new Date(2025, 3, 20);
  const end = new Date(easter);
  end.setDate(end.getDate() + 1);
  return { start: new Date(easter.getTime() - 2 * 24 * 60 * 60 * 1000), end };
}

function getNewYearDates(): { start: Date; end: Date } {
  const year = new Date().getFullYear();
  return { start: new Date(year, 11, 31), end: new Date(year + 1, 0, 2) };
}

function getSummerBreak(): { start: Date; end: Date } {
  const year = new Date().getFullYear();
  return { start: new Date(year, 6, 15), end: new Date(year, 6, 28) };
}

export const HOLIDAY_PRESETS = [
  { id: 'christmas', label: 'Christmas Week', dates: () => getChristmasWeek() },
  { id: 'easter', label: 'Easter Weekend', dates: () => getEasterWeekend() },
  { id: 'newyear', label: 'New Year', dates: () => getNewYearDates() },
  { id: 'summer', label: 'Summer Break (2 weeks)', dates: () => getSummerBreak() },
] as const;

export function formatBlockDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function getDaysBetween(start: Date, end: Date): number {
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}
