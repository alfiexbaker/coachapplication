import { StyleSheet } from 'react-native';

import { Components, Radii, Spacing, Typography } from '@/constants/theme';

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
    lineHeight: 22,
    fontWeight: '500',
  },
  searchBar: {
    borderWidth: 2,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md + 4,
  },
  searchInput: {
    ...Typography.subheading,
    flex: 1,
    paddingVertical: 0,
  },
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
  emptyText: {
    ...Typography.bodySmall,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 260,
  },
  coachList: {
    gap: Spacing.md,
  },
  resultsText: {
    ...Typography.smallSemiBold,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    opacity: 0.6,
    paddingHorizontal: Spacing.xs,
  },
  coachCard: {
    borderRadius: Radii.lg,
  },
  cardContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  coachHeader: {},
  avatar: {
    width: 56,
    height: 56,
    borderRadius: Radii['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...Typography.display },
  coachInfo: {
    flex: 1,
    gap: Spacing.xs / 2,
  },
  coachName: { ...Typography.heading },
  coachMeta: {},
  metaItem: {},
  metaText: { ...Typography.small },
  price: { ...Typography.heading },
  bio: { ...Typography.bodySmall, lineHeight: 20 },
  specialties: {},
  specialtyBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs / 2,
    borderRadius: Radii.sm,
  },
  specialtyText: { ...Typography.caption },
  moreText: { ...Typography.caption },
  actionsRow: {},
});
