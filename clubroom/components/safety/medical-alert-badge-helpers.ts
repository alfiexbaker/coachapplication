import { withAlpha } from '@/constants/theme';

export type AlertType = 'allergy' | 'condition' | 'medication' | 'restriction';

export function getAlertConfig(
  type: AlertType,
  palette: { error: string; warning: string; tint: string; muted: string },
) {
  switch (type) {
    case 'allergy':
      return {
        icon: 'alert-circle' as const,
        color: palette.error,
        typeLabel: 'Allergy',
        bgColor: withAlpha(palette.error, 0.07),
      };
    case 'condition':
      return {
        icon: 'fitness' as const,
        color: palette.warning,
        typeLabel: 'Condition',
        bgColor: withAlpha(palette.warning, 0.07),
      };
    case 'medication':
      return {
        icon: 'medkit' as const,
        color: palette.tint,
        typeLabel: 'Medication',
        bgColor: withAlpha(palette.tint, 0.07),
      };
    case 'restriction':
      return {
        icon: 'ban' as const,
        color: palette.muted,
        typeLabel: 'Restriction',
        bgColor: withAlpha(palette.muted, 0.09),
      };
  }
}
