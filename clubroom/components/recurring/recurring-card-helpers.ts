/**
 * RecurringCard — Helpers: status color/icon mapping, time formatting.
 */
import type { RecurringBookingStatus } from '@/constants/types';
import type { ThemeColors } from '@/hooks/useTheme';

export function getStatusColor(status: RecurringBookingStatus, palette: ThemeColors): string {
  switch (status) {
    case 'ACTIVE': return palette.success;
    case 'PAUSED': return palette.warning;
    case 'CANCELLED': return palette.error;
    case 'EXPIRED': return palette.muted;
    default: return palette.muted;
  }
}

export function getStatusIcon(status: RecurringBookingStatus): string {
  switch (status) {
    case 'ACTIVE': return 'checkmark-circle';
    case 'PAUSED': return 'pause-circle';
    case 'CANCELLED': return 'close-circle';
    case 'EXPIRED': return 'time';
    default: return 'help-circle';
  }
}

export function formatRecurringTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}
