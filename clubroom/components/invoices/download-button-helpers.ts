import { Spacing } from '@/constants/theme';

export function getButtonSize(size: 'small' | 'medium' | 'large') {
  switch (size) {
    case 'small':
      return { paddingVertical: Spacing.xs, paddingHorizontal: Spacing.xs + Spacing.xxs };
    case 'large':
      return { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md };
    default:
      return { paddingVertical: Spacing.xs + Spacing.xxs, paddingHorizontal: Spacing.sm };
  }
}

export function getIconSize(size: 'small' | 'medium' | 'large') {
  switch (size) {
    case 'small':
      return 16;
    case 'large':
      return 24;
    default:
      return 20;
  }
}

export function getFontSize(size: 'small' | 'medium' | 'large') {
  switch (size) {
    case 'small':
      return 13;
    case 'large':
      return 17;
    default:
      return 15;
  }
}
