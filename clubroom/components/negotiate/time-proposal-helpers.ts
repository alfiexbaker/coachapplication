import { toDateStr } from '@/utils/format';

// ─── Constants ──────────────────────────────────────────────────────────────

export const TIME_SLOTS = [
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
];

export const DURATION_OPTIONS = [
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

export function getNextFourteenDays(): { date: string; label: string; dayName: string }[] {
  const days: { date: string; label: string; dayName: string }[] = [];
  const today = new Date();

  for (let i = 0; i < 14; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    const dateStr = toDateStr(date);
    const dayName = date.toLocaleDateString('en-GB', { weekday: 'short' });
    const label = date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    });

    days.push({ date: dateStr, label, dayName });
  }

  return days;
}

export function addMinutesToTime(time: string, minutes: number): string {
  const [hours, mins] = time.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMins = totalMinutes % 60;
  return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
}
