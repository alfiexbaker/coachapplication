import { StyleSheet } from 'react-native';

import { Radii, Spacing, Components, Typography } from '@/constants/theme';

export const styles = StyleSheet.create({
  column: {
    flex: 1,
    minWidth: 160,
    maxWidth: 200,
    borderRadius: Radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    justifyContent: 'flex-end',
    padding: Spacing.xs,
  },
  removeButton: {
    width: 24,
    height: 24,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  avatar: {
    width: Components.avatar.lg,
    height: Components.avatar.lg,
    borderRadius: Components.avatar.lg / 2,
    marginBottom: Spacing.xs,
  },
  name: { ...Typography.body, textAlign: 'center' },
  locationRow: {
    alignItems: 'center',
    gap: Spacing.xxs,
    marginTop: Spacing.micro,
  },
  location: { ...Typography.caption },
  values: {
    flex: 1,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  cell: {
    padding: Spacing.xs,
    borderRadius: Radii.sm,
  },
  cellHeader: {
    alignItems: 'center',
    gap: Spacing.xxs,
    marginBottom: Spacing.xxs,
  },
  cellLabel: { ...Typography.caption, flex: 1 },
  cellValue: { ...Typography.bodySemiBold },
  cellSuffix: { ...Typography.caption },
  bestBadge: {
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.pill,
  },
  bestText: {
    ...Typography.micro,
    textTransform: 'uppercase',
  },
  tags: {
    flexWrap: 'wrap',
    gap: Spacing.xxs,
  },
  tag: {
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  tagText: { ...Typography.caption },
  languagesText: { ...Typography.small },
  bookButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    margin: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.button,
  },
  bookButtonText: { ...Typography.bodySmallSemiBold },
});
