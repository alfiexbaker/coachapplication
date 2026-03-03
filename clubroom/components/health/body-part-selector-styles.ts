import { StyleSheet } from 'react-native';

import { Spacing, Radii } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  bodyDiagram: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.xl,
  },
  bodyFigure: {
    alignItems: 'center',
    width: 146,
  },
  head: {
    width: 46,
    height: 46,
    borderRadius: Radii.xl,
    marginBottom: Spacing.micro,
  },
  neck: {
    width: 20,
    height: 12,
    borderRadius: Radii.sm,
    marginBottom: Spacing.micro,
  },
  torsoContainer: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    width: '100%',
  },
  shoulder: {
    width: 24,
    height: 18,
    borderRadius: Radii.sm,
  },
  leftShoulder: {
    marginRight: -4,
  },
  rightShoulder: {
    marginLeft: -4,
  },
  torso: {
    width: 58,
    height: 18,
    borderRadius: Radii.xs,
  },
  armsContainer: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    width: '100%',
  },
  arm: {
    width: 20,
    height: 56,
    borderRadius: Radii.sm,
  },
  core: {
    width: 54,
    height: 56,
    borderRadius: Radii.xs,
    marginHorizontal: Spacing.xxs,
  },
  legsContainer: {
    justifyContent: 'center',
    gap: Spacing.xxs,
    marginTop: Spacing.micro,
  },
  thigh: {
    width: 24,
    height: 44,
    borderRadius: Radii.sm,
  },
  kneesContainer: {
    justifyContent: 'center',
    gap: Spacing.xxs,
    marginTop: Spacing.micro,
  },
  knee: {
    width: 24,
    height: 14,
    borderRadius: Radii.sm,
  },
  lowerLegsContainer: {
    justifyContent: 'center',
    gap: Spacing.xxs,
    marginTop: Spacing.micro,
  },
  calf: {
    width: 20,
    height: 38,
    borderRadius: Radii.sm,
  },
  feetContainer: {
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.micro,
  },
  foot: {
    width: 30,
    height: 10,
    borderRadius: Radii.sm,
  },
});
