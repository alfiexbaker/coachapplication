import { StyleSheet } from 'react-native';

import { Radii, Spacing, Typography } from '@/constants/theme';

export const styles = StyleSheet.create({
  stepContent: {
    gap: Spacing.md,
  },
  photoSection: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.xs,
    paddingRight: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radii.md,
  },
  photoPickerContainer: {
    position: 'relative',
  },
  photo: {
    width: 48,
    height: 48,
    borderRadius: Radii.sm,
  },
  photoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoCopy: {
    flex: 1,
    gap: 2,
  },
  photoHint: {
    ...Typography.caption,
  },
  photoAction: {
    ...Typography.smallSemiBold,
  },
  field: {
    gap: Spacing.xs,
  },
  label: {
    ...Typography.bodySmall,
    fontWeight: '500',
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    ...Typography.body,
  },
  dateInput: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  datePickerPanel: {
    borderWidth: 1,
    borderRadius: Radii.md,
    overflow: 'hidden',
  },
  datePickerDone: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionGrid: {
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  optionChip: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  optionText: {
    ...Typography.small,
    fontWeight: '500',
  },
});
