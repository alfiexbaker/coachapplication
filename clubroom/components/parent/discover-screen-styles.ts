import { StyleSheet } from 'react-native';

import { Spacing, Typography } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flexGrow: 1, paddingBottom: Spacing['2xl'] },
  loadingContainer: { padding: Spacing.lg, alignItems: 'center' },
  errorContainer: {
    marginHorizontal: Spacing.lg,
    padding: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  errorText: { ...Typography.small, flex: 1 },
  retryLink: { ...Typography.smallSemiBold },
  emptyState: { paddingTop: Spacing['3xl'], paddingHorizontal: Spacing.lg, alignItems: 'center', gap: Spacing.sm },
  emptyTitle: { ...Typography.heading, marginTop: Spacing.sm },
  emptyText: { ...Typography.bodySmall, textAlign: 'center', lineHeight: 20 },
});
