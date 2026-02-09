/**
 * Smart Slots — Types, mock data, and heat-color helpers.
 */
import { withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SmartSlotsProps {
  coachId: string;
  onAddSlot?: (day: string, time: string) => void;
  onRemoveSlot?: (day: string, time: string) => void;
  onCopyLastWeek?: () => void;
}

export interface SlotSuggestion {
  id: string;
  day: string;
  time: string;
  metric: string;
  type: 'add' | 'remove';
  description: string;
}

export interface DayHeatmapData {
  day: string;
  shortDay: string;
  slots: { time: string; bookingRate: number }[];
}

// ---------------------------------------------------------------------------
// Heat-color helpers
// ---------------------------------------------------------------------------

export function getHeatColor(rate: number, colors: ThemeColors): string {
  if (rate === 0) return colors.background;
  if (rate < 0.3) return withAlpha(colors.success, 0.12);
  if (rate < 0.6) return withAlpha(colors.success, 0.31);
  if (rate < 0.8) return withAlpha(colors.success, 0.5);
  return withAlpha(colors.success, 0.8);
}

export function getHeatTextColor(rate: number, colors: ThemeColors): string {
  if (rate >= 0.6) return colors.surface;
  return colors.muted;
}

// ---------------------------------------------------------------------------
// Mock analysis data (MVP)
// ---------------------------------------------------------------------------

export const MOCK_SUGGESTIONS: SlotSuggestion[] = [
  { id: 's1', day: 'Saturday', time: '10:00 AM', metric: '90% booked', type: 'add', description: 'Saturdays 10am: Frequently booked. Consider adding a second group.' },
  { id: 's2', day: 'Wednesday', time: '4:00 PM', metric: '85% booked', type: 'add', description: 'Weekday after-school slot consistently popular. 3 families on waitlist.' },
  { id: 's3', day: 'Sunday', time: '9:00 AM', metric: '5 searches', type: 'add', description: 'Sunday mornings: High search volume but you have no slots open.' },
  { id: 's4', day: 'Wednesday', time: '8:00 PM', metric: '0% booked', type: 'remove', description: 'Wednesday eves: No bookings in last 4 weeks.' },
  { id: 's5', day: 'Tuesday', time: '11:00 AM', metric: '15% booked', type: 'remove', description: 'Mid-morning slot rarely booked. Consider removing or discounting.' },
];

export const MOCK_HEATMAP: DayHeatmapData[] = [
  { day: 'Monday', shortDay: 'Mon', slots: [
    { time: '9am', bookingRate: 0.3 }, { time: '10am', bookingRate: 0.5 }, { time: '11am', bookingRate: 0.2 },
    { time: '2pm', bookingRate: 0.4 }, { time: '3pm', bookingRate: 0.6 }, { time: '4pm', bookingRate: 0.8 }, { time: '5pm', bookingRate: 0.7 },
  ]},
  { day: 'Tuesday', shortDay: 'Tue', slots: [
    { time: '9am', bookingRate: 0.2 }, { time: '10am', bookingRate: 0.3 }, { time: '11am', bookingRate: 0.15 },
    { time: '2pm', bookingRate: 0.5 }, { time: '3pm', bookingRate: 0.6 }, { time: '4pm', bookingRate: 0.75 }, { time: '5pm', bookingRate: 0.6 },
  ]},
  { day: 'Wednesday', shortDay: 'Wed', slots: [
    { time: '9am', bookingRate: 0.4 }, { time: '10am', bookingRate: 0.5 }, { time: '11am', bookingRate: 0.3 },
    { time: '2pm', bookingRate: 0.6 }, { time: '3pm', bookingRate: 0.7 }, { time: '4pm', bookingRate: 0.85 }, { time: '5pm', bookingRate: 0.7 },
  ]},
  { day: 'Thursday', shortDay: 'Thu', slots: [
    { time: '9am', bookingRate: 0.25 }, { time: '10am', bookingRate: 0.4 }, { time: '11am', bookingRate: 0.2 },
    { time: '2pm', bookingRate: 0.5 }, { time: '3pm', bookingRate: 0.65 }, { time: '4pm', bookingRate: 0.8 }, { time: '5pm', bookingRate: 0.65 },
  ]},
  { day: 'Friday', shortDay: 'Fri', slots: [
    { time: '9am', bookingRate: 0.2 }, { time: '10am', bookingRate: 0.35 }, { time: '11am', bookingRate: 0.15 },
    { time: '2pm', bookingRate: 0.4 }, { time: '3pm', bookingRate: 0.55 }, { time: '4pm', bookingRate: 0.7 }, { time: '5pm', bookingRate: 0.5 },
  ]},
  { day: 'Saturday', shortDay: 'Sat', slots: [
    { time: '9am', bookingRate: 0.8 }, { time: '10am', bookingRate: 0.9 }, { time: '11am', bookingRate: 0.85 },
    { time: '2pm', bookingRate: 0.6 }, { time: '3pm', bookingRate: 0.5 }, { time: '4pm', bookingRate: 0.3 }, { time: '5pm', bookingRate: 0.1 },
  ]},
  { day: 'Sunday', shortDay: 'Sun', slots: [
    { time: '9am', bookingRate: 0.0 }, { time: '10am', bookingRate: 0.0 }, { time: '11am', bookingRate: 0.0 },
    { time: '2pm', bookingRate: 0.0 }, { time: '3pm', bookingRate: 0.0 }, { time: '4pm', bookingRate: 0.0 }, { time: '5pm', bookingRate: 0.0 },
  ]},
];

export const MOCK_STATS = {
  totalSessionsLastMonth: 34,
  averageBookingRate: 0.62,
  peakDay: 'Saturday',
  peakTime: '10:00 AM',
  waitlistCount: 8,
};
