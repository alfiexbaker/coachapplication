import { StyleSheet } from 'react-native';

import { Spacing, Radii } from '@/constants/theme';
import { scaleFont } from '@/utils/scale';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bodyDiagram: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: Radii.lg,
  },
  bodyFigure: {
    alignItems: 'center',
    width: 120,
  },
  head: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    marginBottom: Spacing.xxs,
  },
  torsoContainer: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    width: '100%',
  },
  shoulder: {
    width: 20,
    height: 16,
    borderRadius: Radii.sm,
  },
  leftShoulder: {
    marginRight: -4,
  },
  rightShoulder: {
    marginLeft: -4,
  },
  torso: {
    width: 48,
    height: 16,
    borderRadius: Radii.xs,
  },
  armsContainer: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    width: '100%',
  },
  arm: {
    width: 16,
    height: 50,
    borderRadius: Radii.sm,
  },
  core: {
    width: 44,
    height: 50,
    borderRadius: Radii.xs,
    marginHorizontal: Spacing.micro,
  },
  legsContainer: {
    justifyContent: 'center',
    gap: Spacing.xxs,
    marginTop: Spacing.xxs,
  },
  thigh: {
    width: 22,
    height: 45,
    borderRadius: Radii.sm,
  },
  lowerLegsContainer: {
    justifyContent: 'center',
    gap: Spacing.xxs,
    marginTop: Spacing.micro,
  },
  calf: {
    width: 18,
    height: 40,
    borderRadius: Radii.sm,
  },
  feetContainer: {
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.micro,
  },
  foot: {
    width: 24,
    height: 12,
    borderRadius: Radii.sm,
  },
  selectedLabel: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
  },
  selectedLabelText: {
    fontSize: scaleFont(14),
    fontWeight: '600',
  },
  categoriesContainer: {
    paddingBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: scaleFont(13),
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  categoryItem: {
    marginBottom: Spacing.xs,
  },
  categoryHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  categoryLeft: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  categoryLabel: {
    fontSize: scaleFont(15),
    fontWeight: '600',
  },
  partsGrid: {
    flexWrap: 'wrap',
    padding: Spacing.sm,
    gap: Spacing.xs,
    marginTop: Spacing.micro,
    borderBottomLeftRadius: Radii.md,
    borderBottomRightRadius: Radii.md,
  },
  partItem: {
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1,
    gap: Spacing.xxs,
  },
  partLabel: {
    fontSize: scaleFont(13),
    fontWeight: '500',
  },
});
