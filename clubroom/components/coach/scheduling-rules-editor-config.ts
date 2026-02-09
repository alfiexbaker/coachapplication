/**
 * SchedulingRulesEditor — Stepper field configuration.
 */
import { Ionicons } from '@expo/vector-icons';
import type { CoachSchedulingRules } from '@/constants/types';

export interface StepperConfig {
  key: keyof Pick<
    CoachSchedulingRules,
    | 'bufferMinutesDefault'
    | 'minimumAdvanceBookingHours'
    | 'maxAdvanceBookingDays'
    | 'rescheduleDeadlineHours'
    | 'maxConcurrentDefault'
  >;
  label: string;
  helper: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBgKey: 'tint' | 'warning' | 'success';
  step: number;
  min: number;
  max: number;
  formatValue: (v: number) => string;
}

export const STEPPER_FIELDS: StepperConfig[] = [
  {
    key: 'bufferMinutesDefault',
    label: 'Buffer Between Sessions',
    helper: 'Break time between back-to-back bookings',
    icon: 'pause-outline',
    iconBgKey: 'tint',
    step: 5, min: 0, max: 60,
    formatValue: (v) => (v === 0 ? 'None' : `${v} min`),
  },
  {
    key: 'minimumAdvanceBookingHours',
    label: 'Minimum Advance Booking',
    helper: 'How much notice athletes must give when booking',
    icon: 'time-outline',
    iconBgKey: 'warning',
    step: 1, min: 0, max: 72,
    formatValue: (v) => {
      if (v === 0) return 'None';
      if (v >= 24) { const d = Math.floor(v / 24); const h = v % 24; return h === 0 ? `${d}d` : `${d}d ${h}h`; }
      return `${v}h`;
    },
  },
  {
    key: 'maxAdvanceBookingDays',
    label: 'Max Advance Booking',
    helper: 'How far ahead athletes can book sessions',
    icon: 'calendar-outline',
    iconBgKey: 'success',
    step: 7, min: 7, max: 90,
    formatValue: (v) => {
      if (v % 7 === 0) return `${v / 7} week${v / 7 > 1 ? 's' : ''}`;
      return `${v} days`;
    },
  },
  {
    key: 'rescheduleDeadlineHours',
    label: 'Reschedule Deadline',
    helper: 'Minimum notice to reschedule a booking',
    icon: 'swap-horizontal-outline',
    iconBgKey: 'tint',
    step: 1, min: 1, max: 48,
    formatValue: (v) => {
      if (v >= 24) { const d = Math.floor(v / 24); const h = v % 24; return h === 0 ? `${d}d` : `${d}d ${h}h`; }
      return `${v}h`;
    },
  },
  {
    key: 'maxConcurrentDefault',
    label: 'Max Concurrent Sessions',
    helper: 'Maximum sessions running at the same time',
    icon: 'people-outline',
    iconBgKey: 'tint',
    step: 1, min: 1, max: 5,
    formatValue: (v) => `${v}`,
  },
];
