import { StyleSheet } from 'react-native';

import { Spacing, Radii, Typography, Components } from '@/constants/theme';

export const styles = StyleSheet.create({
  processingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing['2xl'],
    gap: Spacing.md,
  },
  stateIcon: {
    width: 100,
    height: 100,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  stateTitle: { textAlign: 'center' },
  stateText: { ...Typography.bodySmall, textAlign: 'center' },
  section: { gap: Spacing.sm },
  sectionTitle: { ...Typography.subheading },
  sessionCard: {
    padding: Components.card.padding,
    gap: Spacing.md,
  },
  sessionRow: {
    // layout moved to Row
  },
  coachAvatar: {
    width: 48,
    height: 48,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachInitials: { ...Typography.heading },
  sessionInfo: { flex: 1, gap: Spacing.micro },
  detailsList: { gap: Spacing.sm },
  detailRow: {
    // layout moved to Row
  },
  detailText: { ...Typography.bodySmall, flex: 1 },
  paymentCard: {
    padding: Components.card.padding,
    gap: Spacing.sm,
  },
  priceRow: {
    // layout moved to Row
  },
  feeLabel: {
    // layout moved to Row
  },
  methodCard: {
    padding: Components.card.padding,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: { flex: 1, gap: Spacing.micro },
  changeButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  securityNote: {
    padding: Spacing.md,
    borderRadius: Radii.md,
  },
  securityText: { ...Typography.smallSemiBold, flex: 1 },
});
