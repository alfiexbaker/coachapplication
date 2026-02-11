import { StyleSheet } from 'react-native';

import { Radii, Spacing, Typography } from '@/constants/theme';

export const styles = StyleSheet.create({
  summaryRow: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    marginBottom: Spacing.md,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { ...Typography.caption, marginBottom: Spacing.micro },
  summaryDivider: { width: 1, height: '100%' },
  playerRow: {
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginBottom: Spacing.xs,
  },
  disabledRow: { opacity: 0.6 },
  playerAvatar: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...Typography.bodySmallSemiBold },
  playerDetails: { flex: 1 },
  positionText: { ...Typography.caption },
  selectionIndicator: { width: 28, alignItems: 'center' },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reserveText: { ...Typography.caption },
  emptyCircle: {
    width: 24,
    height: 24,
    borderRadius: Radii.md,
    borderWidth: 2,
  },
  footer: { padding: Spacing.md, borderTopWidth: 1 },
  submitButton: {
    padding: Spacing.md,
    borderRadius: Radii.md,
  },
  disabledButton: { opacity: 0.5 },
  submitText: { ...Typography.bodySemiBold },
});
