import { Ionicons } from '@expo/vector-icons';

import type { ThemeColors } from '@/hooks/useTheme';
import type { CounterOfferStatus, TimeSlot } from '@/constants/types';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TimelineEvent {
  id: string;
  type: 'original' | 'offer' | 'accepted' | 'rejected' | 'expired';
  timestamp: string;
  proposerName: string;
  proposerRole: 'PARENT' | 'COACH';
  isCurrentUser: boolean;
  time: TimeSlot;
  message?: string;
  rejectionReason?: string;
  status?: CounterOfferStatus;
}

// ─── Formatters ─────────────────────────────────────────────────────────────

export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatTimeSlot(slot: TimeSlot): string {
  const date = new Date(slot.date);
  const dateStr = date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  return `${dateStr} at ${slot.startTime}`;
}

// ─── Status Icons ───────────────────────────────────────────────────────────

export function getStatusIcon(
  type: TimelineEvent['type'],
  palette: ThemeColors
): { name: keyof typeof Ionicons.glyphMap; color: string } {
  switch (type) {
    case 'original':
      return { name: 'flag-outline', color: palette.muted };
    case 'offer':
      return { name: 'swap-horizontal', color: palette.warning };
    case 'accepted':
      return { name: 'checkmark-circle', color: palette.success };
    case 'rejected':
      return { name: 'close-circle', color: palette.error };
    case 'expired':
      return { name: 'hourglass-outline', color: palette.muted };
    default:
      return { name: 'ellipse-outline', color: palette.muted };
  }
}
