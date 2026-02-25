import { StyleSheet } from 'react-native';

import { Spacing, Radii, Typography } from '@/constants/theme';

export const styles = StyleSheet.create({
  weekNav: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xs,
  },
  navBtn: {
    padding: Spacing.xs,
  },
  counterRow: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
  },
  counterText: {
    ...Typography.smallSemiBold,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['2xl'],
    gap: Spacing.sm,
  },
  loadingText: {
    ...Typography.small,
  },
  dayColumn: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    gap: Spacing.md,
  },
  dayHeader: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.micro,
  },
  dayLabel: {
    ...Typography.micro,
    textTransform: 'uppercase',
  },
  dayDate: {
    fontSize: Typography.heading.fontSize,
  },
  slotsRow: {
    flex: 1,
    flexWrap: 'wrap',
    gap: Spacing.xs,
    alignItems: 'center',
  },
  noSlots: {
    ...Typography.small,
    paddingVertical: Spacing.xs,
  },
  slotChip: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  slotContent: {
    flex: 1,
    gap: Spacing.micro,
  },
  slotLocationRow: {
    alignItems: 'center',
    gap: Spacing.micro,
  },
  slotTime: {
    ...Typography.smallSemiBold,
  },
  slotLocation: {
    ...Typography.micro,
  },
  slotBadge: {
    ...Typography.micro,
  },
});
