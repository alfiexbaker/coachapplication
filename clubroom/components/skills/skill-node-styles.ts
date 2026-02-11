import { StyleSheet } from 'react-native';

import { Radii, Spacing, Typography } from '@/constants/theme';

export const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  nodeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    opacity: 0.3,
  },
  progressRing: {
    position: 'absolute',
    borderWidth: 3,
  },
  levelBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  levelText: { ...Typography.micro },
  labelContainer: {
    alignItems: 'center',
    maxWidth: 80,
  },
  label: {
    ...Typography.caption,
    textAlign: 'center',
    lineHeight: 14,
  },
  progressText: { ...Typography.micro },
});
