import type { BookingSummary } from '@/constants/types';
import type { useTheme } from '@/hooks/useTheme';

type ThemeColors = ReturnType<typeof useTheme>['colors'];

export function getStatusColor(status: BookingSummary['status'], palette: ThemeColors): string {
  switch (status) {
    case 'Confirmed':
      return palette.success;
    case 'Pending':
      return palette.warning;
    case 'Completed':
      return palette.muted;
    case 'Cancelled':
    case 'Declined':
    case 'Withdrawn':
      return palette.error;
    case 'Expired':
      return palette.muted;
    default:
      return palette.muted;
  }
}

export function formatBookingDate(dateStr: string): { day: string; time: string } {
  const date = new Date(dateStr);
  return {
    day: date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
    time: date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
  };
}
