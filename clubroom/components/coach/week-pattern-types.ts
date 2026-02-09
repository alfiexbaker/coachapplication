/**
 * WeekPatternGrid shared types and constants.
 */
import type { AvailabilityTemplate, AvailabilityOverride } from '@/constants/types';

// Monday-first ordering for display
export const DAYS_ORDERED = [
  { index: 1, short: 'MON', full: 'Monday' },
  { index: 2, short: 'TUE', full: 'Tuesday' },
  { index: 3, short: 'WED', full: 'Wednesday' },
  { index: 4, short: 'THU', full: 'Thursday' },
  { index: 5, short: 'FRI', full: 'Friday' },
  { index: 6, short: 'SAT', full: 'Saturday' },
  { index: 0, short: 'SUN', full: 'Sunday' },
] as const;

export interface SetupDayConfig {
  enabled: boolean;
  startTime: string;
  endTime: string;
  location: string;
}

export interface WeekPatternGridProps {
  templates: AvailabilityTemplate[];
  overrides: AvailabilityOverride[];
  blockedDates: Set<string>;
  coachId: string;
  isSetupMode: boolean;
  onDayPress: (dayOfWeek: number, templateId?: string, dateStr?: string) => void;
  onSetupComplete?: (templates: AvailabilityTemplate[]) => void;
  onTimeOffPress?: (dateStr: string, existingOverride?: AvailabilityOverride) => void;
}

export const PRESETS = [
  { id: 'weekdays', label: 'Weekdays 9-5', days: [1, 2, 3, 4, 5], start: '09:00', end: '17:00' },
  { id: 'mwf', label: 'Mon/Wed/Fri', days: [1, 3, 5], start: '09:00', end: '17:00' },
  { id: 'custom', label: 'Custom', days: [] as number[], start: '09:00', end: '17:00' },
];

/** Parses HH:MM to total minutes */
export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function formatTimeRange(start: string, end: string): string {
  const fmt = (t: string) => {
    const [h] = t.split(':').map(Number);
    if (h === 12) return '12:00';
    if (h === 0) return '00:00';
    return t;
  };
  return `${fmt(start)} - ${fmt(end)}`;
}
