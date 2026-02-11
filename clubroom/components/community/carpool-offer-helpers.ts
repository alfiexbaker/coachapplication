import type { CarpoolOffer } from '@/constants/types';
import type { ThemeColors } from '@/hooks/useTheme';

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function getStatusColor(offer: CarpoolOffer, palette: ThemeColors): string {
  if (offer.status === 'CANCELLED') return palette.error;
  if (offer.status === 'COMPLETED') return palette.muted;
  const seatsLeft = offer.seatsAvailable - offer.seatsTaken;
  if (seatsLeft === 0) return palette.warning;
  return palette.success;
}

export function getStatusText(offer: CarpoolOffer): string {
  if (offer.status === 'CANCELLED') return 'Cancelled';
  if (offer.status === 'COMPLETED') return 'Completed';
  const seatsLeft = offer.seatsAvailable - offer.seatsTaken;
  if (seatsLeft === 0) return 'Full';
  return `${seatsLeft} seat${seatsLeft !== 1 ? 's' : ''} left`;
}
