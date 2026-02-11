import { StyleSheet } from 'react-native';

import { Spacing, Radii, Typography } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  summaryCard: {
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  summaryHeader: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  summaryLabel: { ...Typography.bodySmallSemiBold },
  totalAmount: { ...Typography.display, letterSpacing: -1 },
  summaryStats: {
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  summaryStat: {
    alignItems: 'center',
  },
  summaryStatValue: { ...Typography.heading },
  summaryStatLabel: { ...Typography.caption },
  summaryDivider: {
    width: 1,
    height: 32,
  },
  breakdownCard: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  sectionTitle: { ...Typography.bodySmall },
  progressBarContainer: {
    height: 8,
    borderRadius: Radii.xs,
    overflow: 'hidden',
  },
  progressBarSegment: {
    height: '100%',
  },
  childList: {
    gap: Spacing.sm,
  },
  childRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  childInfo: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  childColorDot: {
    width: 10,
    height: 10,
    borderRadius: Radii.sm,
  },
  childName: { ...Typography.bodySmall },
  childStats: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  trendBadge: {
    alignItems: 'center',
    gap: Spacing.micro,
  },
  trendText: { ...Typography.caption },
  childAmount: { ...Typography.bodySmall },
  childSessions: { ...Typography.caption },
  chartCard: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  barChart: {
    justifyContent: 'space-between',
    height: 140,
    paddingTop: Spacing.sm,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  barWrapper: {
    flex: 1,
    width: '60%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: Radii.xs,
    minHeight: 4,
  },
  barLabel: { ...Typography.caption },
  barValue: { ...Typography.micro },
  emptyCard: {
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyText: { ...Typography.subheading },
  emptySubtext: { ...Typography.bodySmall, textAlign: 'center' },
});
