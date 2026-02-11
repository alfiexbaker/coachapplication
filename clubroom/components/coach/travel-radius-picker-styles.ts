import { StyleSheet } from 'react-native';

import { Spacing, Radii, Typography, Shadows } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  title: {
    ...Typography.heading,
  },
  unitToggle: {
    borderRadius: Radii.pill,
    padding: Spacing.micro,
  },
  unitButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  unitButtonText: {
    ...Typography.caption,
  },
  displayArea: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  radiusCircle: {
    width: 120,
    height: 120,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  radiusValue: {
    ...Typography.display,
    fontSize: 36,
  },
  radiusUnit: {
    ...Typography.caption,
    marginTop: -4,
  },
  postcodeRow: {
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  locationLabel: {
    ...Typography.body,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xxs,
  },
  sliderLabel: {
    ...Typography.caption,
  },
  quickSetRow: {
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  quickSetBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  quickSetText: {
    ...Typography.smallSemiBold,
  },
  helperArea: {
    gap: 8,
  },
  helperText: {
    flex: 1,
    ...Typography.small,
  },
  toast: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    ...Shadows.light.card,
  },
  toastText: {
    ...Typography.bodySemiBold,
  },
});
