import { StyleSheet } from 'react-native';

import { Radii, Spacing, Typography } from '@/constants/theme';

export const styles = StyleSheet.create({
  originalTimeCard: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    gap: Spacing.xxs,
  },
  originalTimeHeader: {},
  originalTimeLabel: {
    ...Typography.small,
  },
  originalTimeValue: {
    ...Typography.bodySemiBold,
  },
  locationRow: {
    marginTop: Spacing.micro,
  },
  locationText: {
    ...Typography.small,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    marginBottom: Spacing.xxs,
  },
  dateScrollContent: {
    gap: Spacing.sm,
    paddingRight: Spacing.lg,
  },
  dateChip: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    minWidth: 70,
  },
  dateDayName: {
    ...Typography.small,
    fontWeight: '600',
  },
  dateLabel: {
    ...Typography.small,
  },
  timeGrid: {},
  timeChip: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
  },
  timeLabel: {
    ...Typography.small,
    fontWeight: '500',
  },
  durationRow: {},
  durationChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1.5,
  },
  durationLabel: {
    ...Typography.small,
    fontWeight: '500',
  },
  summaryCard: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  summaryTitle: {
    ...Typography.small,
    fontWeight: '600',
    marginBottom: Spacing.xxs,
  },
  summaryRow: {},
});
