import { StyleSheet } from 'react-native';

import { Spacing, Radii, Typography } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  header: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: { ...Typography.bodySmall },
  viewAllText: { ...Typography.smallSemiBold },
  sessionsList: {
    gap: Spacing.sm,
  },
  sessionCard: {
    overflow: 'hidden',
    padding: 0,
  },
  colorBar: {
    width: 4,
  },
  sessionContent: {
    flex: 1,
    padding: Spacing.sm,
    gap: 8,
  },
  sessionHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateTime: {
    alignItems: 'baseline',
    gap: Spacing.xs,
  },
  dateText: { ...Typography.bodySmall },
  timeText: { ...Typography.caption },
  statusBadge: {
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: 8,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: Radii.xs,
  },
  statusText: { ...Typography.caption },
  sessionInfo: {
    gap: Spacing.micro,
  },
  sessionTitle: { ...Typography.body },
  sessionDescription: { ...Typography.small },
  metaRow: {
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  metaItem: {
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  childDot: {
    width: 8,
    height: 8,
    borderRadius: Radii.xs,
  },
  metaText: { ...Typography.caption },
  priceRow: {
    justifyContent: 'flex-end',
  },
  priceText: { ...Typography.bodySmall },
  chevronContainer: {
    justifyContent: 'center',
    paddingRight: Spacing.sm,
  },
  viewAllButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderRadius: Radii.lg,
    marginTop: Spacing.xs,
  },
  viewAllButtonText: { ...Typography.bodySmallSemiBold },
});
