import { StyleSheet } from 'react-native';

import { Radii, Spacing, Typography } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: {
    paddingBottom: Spacing.xl,
  },
  flex1: { flex: 1 },
  section: {
    gap: Spacing.sm,
  },
  focusBadge: {
    alignItems: 'center',
    gap: Spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  focusOption: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.md,
    minHeight: 44,
  },
  input: {
    ...Typography.bodySmall,
    minHeight: 80,
    borderRadius: Radii.md,
    padding: Spacing.md,
    textAlignVertical: 'top',
  },
  cancelButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.md,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
  },
  searchContainer: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.md,
  },
  searchInput: {
    flex: 1,
    ...Typography.bodySmall,
    paddingVertical: Spacing.xxs,
  },
  noteCard: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    gap: Spacing.xs,
  },
  noteDate: {
    ...Typography.caption,
  },
  noteContent: {
    ...Typography.bodySmall,
  },
  emptyNotes: {
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  emptyText: {
    ...Typography.small,
    textAlign: 'center',
    lineHeight: 18,
  },
});
