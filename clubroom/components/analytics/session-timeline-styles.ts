import { StyleSheet } from 'react-native';

import { Radii, Spacing, Typography } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: {
    gap: Spacing.lg,
  },
  title: {
    marginBottom: Spacing.xs,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  monthGroup: {
    gap: Spacing.sm,
  },
  monthLabel: {
    ...Typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  eventsContainer: {
    gap: 0,
  },
  eventRow: {
    gap: Spacing.md,
  },
  timelineColumn: {
    alignItems: 'center',
    width: 32,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineLine: {
    flex: 1,
    width: 2,
    minHeight: 20,
    marginVertical: Spacing.xxs,
  },
  eventContent: {
    flex: 1,
    paddingBottom: Spacing.md,
    gap: Spacing.xxs,
  },
  eventHeader: {
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  eventTitle: { ...Typography.bodySmall, flex: 1 },
  eventDate: { ...Typography.caption },
  eventSubtitle: { ...Typography.small },
  eventMeta: {
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.micro,
  },
  metaItem: {
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  metaText: { ...Typography.caption },
  horizontalContainer: {
    paddingVertical: Spacing.sm,
    gap: 0,
  },
  horizontalItem: {
    alignItems: 'center',
  },
  horizontalLine: {
    width: 20,
    height: 2,
  },
  horizontalCard: {
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    width: 100,
    gap: Spacing.xs,
  },
  horizontalIcon: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  horizontalDate: { ...Typography.caption },
  horizontalTitle: { ...Typography.caption, textAlign: 'center' },
});
