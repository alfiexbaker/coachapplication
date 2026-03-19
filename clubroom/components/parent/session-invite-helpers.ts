/**
 * SessionInviteCard — Helpers and status colors.
 */
import { withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';

export function getStatusColors(palette: ThemeColors) {
  return {
    PENDING: { bg: withAlpha(palette.warning, 0.12), text: palette.warning, icon: 'hourglass-outline' },
    ACCEPTED: { bg: withAlpha(palette.success, 0.12), text: palette.success, icon: 'checkmark-circle-outline' },
    DECLINED: { bg: withAlpha(palette.error, 0.12), text: palette.error, icon: 'close-circle-outline' },
    EXPIRED: { bg: palette.background, text: palette.muted, icon: 'time-outline' },
  } as Record<string, { bg: string; text: string; icon: string }>;
}

export function getExpiryCountdown(expiresAt: string): string {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry.getTime() - now.getTime();
  if (diffMs <= 0) return 'Expired';
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (diffDays > 1) return `${diffDays} days left`;
  if (diffDays === 1) return `${diffDays} day ${diffHours}h left`;
  if (diffHours > 0) return `${diffHours} hours left`;
  return 'Expires soon';
}
