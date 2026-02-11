import { StyleSheet } from 'react-native';

import { Spacing, Radii, Typography } from '@/constants/theme';

export const styles = StyleSheet.create({
  card: {
    padding: 0,
    overflow: 'hidden',
  },
  header: {
    padding: Spacing.md,
  },
  headerContent: {},
  sessionInfo: {
    flex: 1,
    marginRight: Spacing.md,
    gap: Spacing.xxs,
  },
  sessionTitle: { ...Typography.body },
  statsRow: {},
  statBadge: {
    paddingHorizontal: 8,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.md,
  },
  statText: { ...Typography.caption },
  headerRight: {},
  actions: {
    padding: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.sm,
  },
  actionButtonText: { ...Typography.smallSemiBold },
  entriesList: {
    borderTopWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  entriesHeader: {
    ...Typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  entryRow: {
    paddingVertical: Spacing.sm,
  },
  entryInfo: {},
  positionCircle: {
    width: 24,
    height: 24,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionNumber: { ...Typography.caption },
  userInfo: {},
  userPhotoPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDetails: {
    flex: 1,
    gap: Spacing.micro,
  },
  userName: { ...Typography.bodySmall },
  entryMeta: {},
  joinedTime: { ...Typography.caption },
  autoBookBadge: {
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  autoBookText: { ...Typography.micro },
  notifiedBadge: {
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  notifiedText: { ...Typography.micro },
  removeButton: {
    padding: Spacing.xxs,
  },
  emptyState: {
    borderTopWidth: 1,
    padding: Spacing.md,
    alignItems: 'center',
  },
  emptyText: { ...Typography.small },
});
