import { StyleSheet } from 'react-native';

import { Spacing, Radii, Typography } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.md,
    paddingBottom: Spacing['2xl'],
    gap: Spacing.md,
  },
  header: {
    marginBottom: Spacing.sm,
  },
  invoiceNumber: { ...Typography.display, marginBottom: Spacing.xs },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: Radii.xs,
  },
  statusText: { ...Typography.smallSemiBold },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amountLabel: { ...Typography.caption, marginBottom: Spacing.micro },
  amount: { ...Typography.display },
  card: {
    padding: Spacing.md,
  },
  dateItem: {
    gap: Spacing.micro,
  },
  dateLabel: {
    ...Typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  partyCard: {
    flex: 1,
  },
  partyLabel: {
    ...Typography.micro,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  partyName: { ...Typography.body, marginBottom: Spacing.xxs },
  partyDetail: { ...Typography.small, lineHeight: Typography.caption.lineHeight },
  sectionTitle: {
    ...Typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  sessionDetails: {
    gap: Spacing.sm,
  },
  detailContent: {
    flex: 1,
    gap: Spacing.micro,
  },
  detailLabel: { ...Typography.caption },
  pricingRows: {
    gap: Spacing.xs,
  },
  pricingRow: {
    paddingVertical: Spacing.xxs,
  },
  totalRow: {
    borderTopWidth: 1,
    paddingTop: Spacing.sm,
    marginTop: Spacing.xs,
  },
  voidHeader: {
    marginBottom: Spacing.xs,
  },
  voidReason: { ...Typography.bodySmall },
  voidDate: { ...Typography.caption, marginTop: Spacing.xs },
  sentInfo: {
    paddingTop: Spacing.sm,
  },
  sentText: { ...Typography.small },
});
