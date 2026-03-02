import { StyleSheet } from 'react-native';

import { Spacing, Radii, Typography } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flexGrow: 1, paddingBottom: Spacing['2xl'] },
  loadingContainer: { padding: Spacing.lg, alignItems: 'center' },
  errorContainer: {
    marginHorizontal: Spacing.lg,
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  errorText: { ...Typography.small, flex: 1 },
  retryLink: { ...Typography.smallSemiBold },
  emptyState: { paddingTop: Spacing['3xl'], paddingHorizontal: Spacing.lg, alignItems: 'center', gap: Spacing.sm },
  emptyTitle: { ...Typography.heading, marginTop: Spacing.sm },
  emptyText: { ...Typography.bodySmall, textAlign: 'center' },
  familyEntryPanel: {
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  familyEntryTile: {
    flex: 1,
    minHeight: 44,
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  familyEntryLabel: { ...Typography.smallSemiBold },
});
