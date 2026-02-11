import { StyleSheet } from 'react-native';

import { Spacing, Radii, Typography, Components } from '@/constants/theme';

export const styles = StyleSheet.create({
  inviteSummary: {
    padding: Spacing.sm,
    borderRadius: Radii.sm,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  inviteSummaryText: { ...Typography.bodySemiBold },
  inviteSummaryMuted: { ...Typography.small },
  reasonItem: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: Radii.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: { width: 12, height: 12, borderRadius: Radii.sm },
  reasonLabel: { ...Typography.body, flex: 1 },
  reasonLabelSelected: { ...Typography.bodySemiBold },
  counterOfferButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    height: Components.button.height,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.md,
    borderRadius: Components.button.borderRadius,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  counterOfferText: { ...Typography.bodySemiBold, flex: 1 },
  buttonRow: {
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  cancelButton: {
    flex: 1,
    height: Components.button.height,
    borderRadius: Components.button.borderRadius,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: { ...Typography.subheading },
  declineButton: {
    flex: 1,
    height: Components.button.height,
    borderRadius: Components.button.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButtonText: { ...Typography.subheading },
  buttonPressed: { opacity: 0.85 },
});
