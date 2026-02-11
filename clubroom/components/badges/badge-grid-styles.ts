import { StyleSheet } from 'react-native';

import { Spacing, Radii, Typography } from '@/constants/theme';

export const styles = StyleSheet.create({
  grid: {
    flexWrap: 'wrap',
  },
  sectionContainer: {
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  sectionHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeaderLeft: {
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitleGroup: {
    flex: 1,
    gap: Spacing.micro,
  },
  sectionTitle: { ...Typography.body },
  sectionSubtitle: { ...Typography.caption },
  sectionProgress: {
    alignItems: 'flex-end',
  },
  progressPercent: { ...Typography.bodySmallSemiBold },
  sectionProgressBar: {
    height: 4,
    borderRadius: Radii.xs,
    overflow: 'hidden',
  },
  sectionProgressFill: {
    height: '100%',
    borderRadius: Radii.xs,
  },
  statsContainer: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  statsRow: {
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: Spacing.xxs,
    flex: 1,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: { ...Typography.display },
  statLabel: {
    ...Typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 50,
  },
  overallProgress: {
    gap: Spacing.xs,
  },
  progressHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressTitle: { ...Typography.bodySmallSemiBold },
  progressValue: { ...Typography.bodySmallSemiBold },
  progressBarLarge: {
    height: 8,
    borderRadius: Radii.xs,
    overflow: 'hidden',
  },
  progressFillLarge: {
    height: '100%',
    borderRadius: Radii.xs,
  },
});
