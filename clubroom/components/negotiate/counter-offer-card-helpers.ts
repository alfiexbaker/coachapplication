import { Ionicons } from '@expo/vector-icons';

import type { CounterOfferStatus } from '@/constants/types';
import type { ThemeColors } from '@/hooks/useTheme';

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const suffix = hour >= 12 ? 'pm' : 'am';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes}${suffix}`;
}

export function getTimeRemaining(expiresAt: string): string {
  const now = new Date();
  const expires = new Date(expiresAt);
  const diffMs = expires.getTime() - now.getTime();

  if (diffMs <= 0) return 'Expired';

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d ${diffHours % 24}h left`;

  if (diffHours > 0) {
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${diffHours}h ${diffMinutes}m left`;
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  return `${diffMinutes}m left`;
}

export function getStatusConfig(
  status: CounterOfferStatus,
  palette: ThemeColors,
): {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
} {
  switch (status) {
    case 'PENDING':
      return { icon: 'time-outline', color: palette.warning, label: 'Pending' };
    case 'ACCEPTED':
      return { icon: 'checkmark-circle-outline', color: palette.success, label: 'Accepted' };
    case 'REJECTED':
      return { icon: 'close-circle-outline', color: palette.error, label: 'Declined' };
    case 'EXPIRED':
      return { icon: 'hourglass-outline', color: palette.muted, label: 'Expired' };
    default:
      return { icon: 'help-circle-outline', color: palette.muted, label: 'Unknown' };
  }
}
