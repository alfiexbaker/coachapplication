import { StyleSheet } from 'react-native';

import { Spacing, Radii, Typography } from '@/constants/theme';

export const styles = StyleSheet.create({
  pickerCard: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.xl,
    borderRadius: Radii.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    gap: Spacing.sm,
  },
  pickerIcon: {
    width: 64,
    height: 64,
    borderRadius: Radii['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  pickerHint: { ...Typography.caption },
  previewCard: {
    padding: 0,
    overflow: 'hidden',
  },
  previewContainer: {
    position: 'relative',
    height: 180,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButton: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 32,
    height: 32,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoInfo: {
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  metaText: { ...Typography.caption },
  useButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    margin: Spacing.md,
    marginTop: 0,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
  },
  disabled: {
    opacity: 0.55,
  },
  requirements: {
    gap: Spacing.sm,
  },
  requirementsTitle: { ...Typography.caption, textTransform: 'uppercase', letterSpacing: 0.5 },
  requirementsList: {
    gap: Spacing.xs,
  },
  requirementText: { ...Typography.small },
});
