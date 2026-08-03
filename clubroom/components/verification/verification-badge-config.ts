import { Spacing, Typography } from '@/constants/theme';
import { VerificationStatus } from '@/constants/types';

export type VerificationLevel = VerificationStatus['overallLevel'];

export const LEVEL_CONFIG: Record<
  VerificationLevel,
  {
    label: string;
    shortLabel: string;
    icon: string;
    colorKey: 'success' | 'warning' | 'muted' | 'tint';
  }
> = {
  PREMIUM: {
    label: 'Fully verified',
    shortLabel: 'Verified',
    icon: 'shield-checkmark',
    colorKey: 'success',
  },
  VERIFIED: {
    label: 'Core checks complete',
    shortLabel: 'Core checks',
    icon: 'checkmark-shield',
    colorKey: 'success',
  },
  BASIC: {
    label: 'Contact verified',
    shortLabel: 'Contact',
    icon: 'checkmark-circle',
    colorKey: 'warning',
  },
  NONE: {
    label: 'Not verified',
    shortLabel: 'Unverified',
    icon: 'shield-outline',
    colorKey: 'muted',
  },
};

export const SIZE_CONFIG = {
  small: {
    ...Typography.caption,
    iconSize: 14,
    paddingH: Spacing.xs,
    paddingV: 3,
    gap: Spacing.micro,
  },
  medium: {
    ...Typography.caption,
    iconSize: 16,
    paddingH: Spacing.sm,
    paddingV: Spacing.xs / 2,
    gap: Spacing.xs / 2,
  },
  large: {
    ...Typography.bodySmall,
    iconSize: 20,
    paddingH: Spacing.sm,
    paddingV: Spacing.xs,
    gap: Spacing.xs,
  },
};
