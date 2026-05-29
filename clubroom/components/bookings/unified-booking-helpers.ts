import type { BookingSummary } from '@/constants/types';
import type { ThemeColors } from '@/hooks/useTheme';

export interface ExtendedBooking extends BookingSummary {
  athleteId?: string;
  price?: number;
  duration?: number;
  notes?: string;
}

export function formatBookingDateTime(start: string) {
  const date = new Date(start);
  return {
    day: date.toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' }),
    time: date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    full: date.toLocaleDateString('en-GB', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }),
  };
}

export function getBookingStatusColor(status: string, palette: ThemeColors): string {
  switch (status) {
    case 'Confirmed':
      return palette.success;
    case 'Pending':
      return palette.warning;
    case 'Needs Completion':
      return palette.warning;
    case 'Completed':
      return palette.muted;
    case 'Cancelled':
      return palette.error;
    default:
      return palette.muted;
  }
}
