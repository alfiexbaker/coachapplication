import { Typography } from '@/constants/theme';

export const SCREEN_TYPOGRAPHY = {
  title: {
    ...Typography.title,
    letterSpacing: -0.3,
  },
  subtitle: {
    ...Typography.caption,
  },
} as const;
