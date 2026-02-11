import { StyleSheet } from 'react-native';

import { Spacing, Radii, Typography } from '@/constants/theme';

export const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: Radii.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  skipRow: {
    alignItems: 'flex-end',
  },
  skipText: {
    ...Typography.bodySmallSemiBold,
  },
  stepContent: {
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    gap: Spacing.sm,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: Radii['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  stepTitle: {
    textAlign: 'center',
  },
  stepDescription: {
    ...Typography.bodySmall,
    textAlign: 'center',
    maxWidth: 300,
  },
  progressDots: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  dot: {
    height: 8,
    borderRadius: Radii.xs,
  },
  buttonRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  backButton: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  backButtonText: {
    ...Typography.bodySmallSemiBold,
  },
  buttonPlaceholder: {
    width: 90,
  },
  nextButton: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    flex: 1,
    justifyContent: 'center',
  },
  nextButtonText: {
    ...Typography.bodySmallSemiBold,
  },
});
