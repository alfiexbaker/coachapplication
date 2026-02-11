import { StyleSheet } from 'react-native';

import { Spacing, Radii, Components, Typography } from '@/constants/theme';

export const styles = StyleSheet.create({
  urlBox: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    height: Components.input.height,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  actionRow: {
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.card,
    marginBottom: Spacing.xs,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrSection: {
    marginTop: Spacing.md,
  },
  qrPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: Radii.card,
  },
  slugSection: {
    marginTop: Spacing.md,
  },
  slugInputRow: {
    alignItems: 'center',
  },
  slugInput: {
    flex: 1,
    height: Components.input.height,
    borderWidth: 1.5,
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.xs,
    ...Typography.body,
  },
  slugDisplay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    height: Components.input.height,
    borderWidth: 1,
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.xs,
  },
  slugActions: {
    justifyContent: 'flex-end',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  slugCancelBtn: {
    height: Components.buttonCompact.height,
    paddingHorizontal: Spacing.sm,
    borderRadius: Components.buttonCompact.borderRadius,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slugSaveBtn: {
    height: Components.buttonCompact.height,
    paddingHorizontal: Spacing.sm,
    borderRadius: Components.buttonCompact.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
