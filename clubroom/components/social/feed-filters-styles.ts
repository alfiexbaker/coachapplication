import { StyleSheet } from 'react-native';

import { Radii, Spacing, Typography } from '@/constants/theme';

export const styles = StyleSheet.create({
  filterScroll: {
    marginTop: 0,
  },
  filterContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xxs,
    gap: Spacing.xs,
  },
  filterTab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  filterLabel: {
    ...Typography.small,
    fontWeight: '500',
  },
  clubPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingVertical: Spacing.xxs,
    paddingHorizontal: 10,
    paddingRight: Spacing.xs + Spacing.xxs,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  clubPillIcon: {
    width: 22,
    height: 22,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubPillIconText: {
    ...Typography.micro,
    fontSize: Typography.micro.fontSize,
    letterSpacing: 0,
    textTransform: 'none',
  },
  clubPillName: {
    ...Typography.smallSemiBold,
  },
  clubPillMore: {
    ...Typography.small,
  },
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl * 2,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  emptyStateIcon: {
    width: 64,
    height: 64,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  emptyTitle: {
    ...Typography.subheading,
    textAlign: 'center',
  },
  emptyDescription: {
    ...Typography.body,
    textAlign: 'center',
    lineHeight: Typography.bodySmall.lineHeight,
  },
  emptyStateActions: {
    marginTop: Spacing.sm,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  emptyStateButtonOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  emptyButtonLabel: {
    ...Typography.bodySemiBold,
  },
  emptyNoPostsText: {
    ...Typography.body,
    textAlign: 'center',
  },
});
