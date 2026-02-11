import { withAlpha } from '@/constants/theme';
import type { BulkInviteResult } from '@/constants/types';
import type { ThemeColors } from '@/hooks/useTheme';

export interface StatusConfig {
  icon: 'checkmark-circle' | 'close-circle' | 'warning';
  color: string;
  bgColor: string;
  title: string;
  subtitle: string;
}

export function getStatusConfig(result: BulkInviteResult, palette: ThemeColors): StatusConfig {
  const { sent, failed, skipped, totalAttempted } = result;
  const isFullSuccess = failed === 0 && skipped === 0;
  const isFullFailure = sent === 0 && totalAttempted > 0;

  if (isFullSuccess) {
    return {
      icon: 'checkmark-circle',
      color: palette.success,
      bgColor: withAlpha(palette.success, 0.12),
      title: 'All Invites Sent!',
      subtitle: `${sent} invite${sent !== 1 ? 's' : ''} sent successfully`,
    };
  }

  if (isFullFailure) {
    return {
      icon: 'close-circle',
      color: palette.error,
      bgColor: withAlpha(palette.error, 0.12),
      title: 'Invites Failed',
      subtitle: 'Unable to send invites. Please try again.',
    };
  }

  return {
    icon: 'warning',
    color: palette.warning,
    bgColor: withAlpha(palette.warning, 0.12),
    title: 'Partially Sent',
    subtitle: `${sent} sent, ${failed} failed${skipped > 0 ? `, ${skipped} skipped` : ''}`,
  };
}
