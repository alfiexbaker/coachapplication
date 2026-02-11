import { StyleSheet } from 'react-native';

import { Radii, Spacing, Typography } from '@/constants/theme';

export const styles = StyleSheet.create({
  goLiveSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  goLiveCard: {
    gap: Spacing.md,
  },
  goLiveHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  goLiveInfo: {
    flex: 1,
    gap: Spacing.micro,
  },
  goLiveTitleRow: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: Radii.full,
  },
  goLiveSubtitle: {
    ...Typography.small,
  },
  progressSection: {
    gap: Spacing.xs,
  },
  progressHeader: {
    justifyContent: 'space-between',
  },
  progressLabel: {
    ...Typography.caption,
  },
  progressPercent: {
    ...Typography.caption,
    fontWeight: '600',
  },
  progressTrack: {
    height: 6,
    borderRadius: Radii.xs,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radii.xs,
  },
  checklistSection: {
    gap: Spacing.xs,
    paddingTop: Spacing.xs,
  },
  checklistItem: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  checklistLabel: {
    ...Typography.small,
  },
  quickAccessSection: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.title,
    marginBottom: Spacing.xs,
  },
  quickAccessCard: {
    padding: 0,
  },
  quickAccessRow: {
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
  },
  quickAccessIcon: {
    width: 48,
    height: 48,
    borderRadius: Radii.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickAccessText: {
    flex: 1,
    gap: Spacing.xxs,
  },
  quickAccessDesc: {
    ...Typography.small,
    lineHeight: 18,
  },
  signOutButton: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: Radii.button,
    borderWidth: 1.5,
    marginTop: Spacing.sm,
  },
  signOutText: {
    ...Typography.subheading,
    fontWeight: '600',
  },
});
