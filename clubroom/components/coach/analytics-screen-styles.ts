import { StyleSheet } from 'react-native';

import { Radii, Spacing, Typography } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing['2xl'],
    gap: Spacing.lg,
  },
  header: {
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  title: { ...Typography.display, letterSpacing: -0.8 },
  subtitle: {
    ...Typography.body,
    fontWeight: '500',
  },
  statsGrid: {
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: 160,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  statNumber: { ...Typography.display },
  statLabel: {
    ...Typography.smallSemiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  change: {
    alignItems: 'center',
    gap: Spacing.xs / 2,
    marginTop: Spacing.xs / 2,
  },
  changeText: { ...Typography.caption },
  section: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  sectionHeader: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionTitle: { ...Typography.subheading },
  skillsList: {
    gap: Spacing.md,
  },
  skillRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skillInfo: {
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  skillRank: { ...Typography.bodySmall, width: 24 },
  skillName: { ...Typography.body },
  skillCount: {
    alignItems: 'baseline',
    gap: Spacing.xs / 2,
  },
  skillCountText: { ...Typography.heading },
  skillCountLabel: { ...Typography.caption },
  insightRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
});
