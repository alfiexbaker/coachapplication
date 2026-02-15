import { StyleSheet } from 'react-native';

import { Spacing, Typography, Radii } from '@/constants/theme';

import { CENTER } from './skill-radar-constants';

export const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  title: {
    ...Typography.heading,
  },
  chartContainer: {
    alignSelf: 'center',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: Radii.pill,
    borderStyle: 'dashed',
  },
  axisLine: {
    position: 'absolute',
    height: 1,
  },
  skillLabel: {
    position: 'absolute',
    width: 72,
    alignItems: 'center',
  },
  skillLabelText: {
    ...Typography.caption,
    textAlign: 'center',
  },
  previousDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: Radii.pill,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  currentDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: Radii.pill,
    borderWidth: 2,
  },
  centerDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: Radii.xs,
  },
  ringLabel: {
    position: 'absolute',
    left: CENTER + 4,
  },
  ringLabelText: { ...Typography.micro },
  legend: {
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  legendItem: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  legendDotFilled: {
    width: 10,
    height: 10,
    borderRadius: Radii.pill,
  },
  legendDotOutline: {
    width: 10,
    height: 10,
    borderRadius: Radii.pill,
    borderWidth: 2,
  },
  legendText: {
    ...Typography.small,
  },
  callouts: {
    borderTopWidth: 1,
    paddingTop: Spacing.sm,
    gap: Spacing.xs,
  },
  calloutRow: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  calloutText: {
    ...Typography.smallSemiBold,
  },
});
