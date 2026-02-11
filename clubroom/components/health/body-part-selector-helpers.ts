import { withAlpha } from '@/constants/theme';
import type { BodyPart } from '@/constants/types';
import type { ThemeColors } from '@/hooks/useTheme';
import { injuryService } from '@/services/injury-service';

export function getPartStyle(
  part: BodyPart,
  selectedPart: BodyPart | null,
  palette: ThemeColors
): { backgroundColor: string; borderColor: string; borderWidth: number } {
  const isSelected = selectedPart === part;
  const isRelated =
    selectedPart &&
    injuryService.getBodyPartCategory(selectedPart) === injuryService.getBodyPartCategory(part);

  if (isSelected) {
    return {
      backgroundColor: palette.tint,
      borderColor: palette.tint,
      borderWidth: 2,
    };
  }

  if (isRelated) {
    return {
      backgroundColor: withAlpha(palette.tint, 0.19),
      borderColor: palette.border,
      borderWidth: 1,
    };
  }

  return {
    backgroundColor: palette.border,
    borderColor: palette.border,
    borderWidth: 1,
  };
}
