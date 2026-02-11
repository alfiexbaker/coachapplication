import { StyleSheet } from 'react-native';

import { Radii, Spacing, Typography } from '@/constants/theme';

export const styles = StyleSheet.create({
  stepContent: {
    gap: Spacing.md,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  photoPickerContainer: {
    position: 'relative',
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: Radii.full,
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoHint: {
    ...Typography.small,
    marginTop: Spacing.xs,
  },
  row: {
    gap: Spacing.md,
  },
  halfField: {
    flex: 1,
  },
  field: {
    gap: Spacing.xs,
  },
  label: {
    ...Typography.bodySmall,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1.5,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    ...Typography.body,
  },
  dateInput: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionGrid: {
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  optionChip: {
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    borderWidth: 1.5,
  },
  optionText: {
    ...Typography.small,
    fontWeight: '500',
  },
});
