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
  const easter = getEasterSunday(year);
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

function getEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

export function formatBlockDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function getDaysBetween(start: Date, end: Date): number {
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}
