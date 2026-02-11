import { StyleSheet } from 'react-native';

import { Radii, Spacing, Typography } from '@/constants/theme';

export const styles = StyleSheet.create({
  subtitle: {
    ...Typography.bodySmall,
    marginBottom: Spacing.md,
  },
  optionsList: {
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  optionRow: {
    padding: Spacing.sm,
    borderRadius: Radii.card,
    borderWidth: 1.5,
  },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionLabel: { ...Typography.bodySemiBold, flex: 1 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: Radii.md,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: Radii.sm,
  },
  descriptionSection: {
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  charCount: { ...Typography.caption, textAlign: 'right' },
  submitButton: {
    marginTop: Spacing.xs,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: Radii['3xl'],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  successTitle: {
    textAlign: 'center',
  },
  successMessage: {
    ...Typography.bodySmall,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
});
