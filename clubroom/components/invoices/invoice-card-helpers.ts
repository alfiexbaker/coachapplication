import { Ionicons } from '@expo/vector-icons';

import type { InvoiceStatus } from '@/constants/types';
import type { useTheme } from '@/hooks/useTheme';

type ThemeColors = ReturnType<typeof useTheme>['colors'];
type IoniconsName = keyof typeof Ionicons.glyphMap;

export function getInvoiceStatusColor(status: InvoiceStatus, palette: ThemeColors): string {
  const map: Record<InvoiceStatus, string> = {
    DRAFT: palette.muted,
    SENT: palette.tint,
    PAID: palette.success,
    VOID: palette.error,
    WRITTEN_OFF: palette.muted,
  };
  return map[status];
}

export function getStatusIcon(status: InvoiceStatus): IoniconsName {
  switch (status) {
    case 'DRAFT':
      return 'document-outline';
    case 'SENT':
      return 'paper-plane-outline';
    case 'PAID':
      return 'checkmark-circle-outline';
    case 'VOID':
      return 'close-circle-outline';
    default:
      return 'document-outline';
  }
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatShortDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
