import { StyleSheet } from 'react-native';

import { Spacing, Radii, Components, Typography } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing['2xl'],
    gap: Spacing.lg,
  },
  header: { gap: Spacing.xs, marginBottom: Spacing.sm },
  title: { ...Typography.display, letterSpacing: -0.8 },
  subtitle: { ...Typography.body, lineHeight: 22, fontWeight: '500' },
  kidsList: { gap: Spacing.md },
  kidCard: { borderRadius: Radii.lg },
  cardContent: { padding: Spacing.lg },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...Typography.display },
  kidDetails: { flex: 1, gap: Spacing.xs / 2 },
  kidName: { ...Typography.subheading },
  kidMetadata: { ...Typography.small, textTransform: 'capitalize' },
  nextSession: { alignItems: 'flex-end', gap: Spacing.xs / 2 },
  sessionBadgeText: { ...Typography.caption },
  sessionInfo: { ...Typography.small },
  sessionCoach: { ...Typography.caption },
  noSessions: { ...Typography.small },
  emptyState: {
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing['2xl'] + Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  emptyIconCircle: {
    width: Components.listItem.large,
    height: Components.listItem.large,
    borderRadius: Components.listItem.large / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  emptyTitle: { ...Typography.heading, letterSpacing: -0.3 },
  emptyText: { ...Typography.bodySmall, lineHeight: 20, textAlign: 'center', maxWidth: 260 },
});
