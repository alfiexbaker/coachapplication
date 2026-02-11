import { StyleSheet } from 'react-native';

import { Spacing, Radii, Typography } from '@/constants/theme';

export const styles = StyleSheet.create({
  statusIcon: {
    width: 56,
    height: 56,
    borderRadius: Radii['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    flex: 1,
    gap: Spacing.micro,
  },
  subtitleText: { ...Typography.small },
  contextRow: {
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  contextText: { ...Typography.caption },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: Radii.xs,
  },
  statValue: { ...Typography.subheading },
  statLabel: { ...Typography.caption },
  errorSection: {
    gap: Spacing.xs,
  },
  errorToggleText: { ...Typography.smallSemiBold },
  errorList: {
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  errorItem: {
    padding: Spacing.sm,
    borderRadius: Radii.sm,
    gap: Spacing.micro,
  },
  errorMessage: { ...Typography.caption },
  actionRow: {
    marginTop: Spacing.xs,
  },
  actionButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  actionButtonText: { ...Typography.smallSemiBold },
  primaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    minWidth: 100,
  },
  primaryButtonText: { ...Typography.bodySmallSemiBold },
  compactContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  compactText: { ...Typography.smallSemiBold, flex: 1 },
});
