import { StyleSheet } from 'react-native';

import { Spacing, Radii, Typography } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: Radii.lg,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  title: { ...Typography.subheading },
  searchContainer: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  searchInput: {
    ...Typography.bodySmall,
    flex: 1,
    paddingVertical: Spacing.xxs,
  },
  filtersContainer: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
    borderWidth: 1,
    gap: Spacing.xxs,
  },
  filterLabel: { ...Typography.caption },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  annotationItem: {
    flexDirection: 'row',
    borderRadius: Radii.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  typeIndicator: {
    width: 4,
  },
  annotationContent: {
    flex: 1,
    padding: Spacing.sm,
    gap: Spacing.xxs,
  },
  typeBadge: {
    width: 22,
    height: 22,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timestamp: { ...Typography.caption },
  actionButton: {
    padding: Spacing.xxs,
  },
  annotationLabel: { ...Typography.bodySmallSemiBold },
  annotationNote: { ...Typography.small },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyText: { ...Typography.bodySmall, textAlign: 'center' },
});
