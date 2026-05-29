import { Ionicons } from '@expo/vector-icons';

import type { RSVPStatus } from '@/constants/types';
import type { ThemeColors } from '@/hooks/useTheme';

export function getButtonStyle(
  status: RSVPStatus,
  currentStatus: RSVPStatus | undefined,
  palette: ThemeColors,
) {
  if (currentStatus === status) {
    switch (status) {
      case 'GOING':
        return { backgroundColor: palette.success, borderColor: palette.success };
      case 'MAYBE':
        return { backgroundColor: palette.warning, borderColor: palette.warning };
      case 'NOT_GOING':
        return { backgroundColor: palette.error, borderColor: palette.error };
    }
  }
  return { backgroundColor: 'transparent' as const, borderColor: palette.border };
}

export function getTextColor(
  status: RSVPStatus,
  currentStatus: RSVPStatus | undefined,
  palette: ThemeColors,
): string {
  return currentStatus === status ? palette.onPrimary : palette.text;
}

export function getIcon(status: RSVPStatus): keyof typeof Ionicons.glyphMap {
  switch (status) {
    case 'GOING':
      return 'checkmark-circle';
    case 'MAYBE':
      return 'help-circle';
    case 'NOT_GOING':
      return 'close-circle';
  }
}
