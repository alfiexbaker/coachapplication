import { StyleSheet } from 'react-native';

import { Radii, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  card: {
    borderRadius: Radii.lg,
    padding: Spacing.md,
    borderWidth: 0.75,
    overflow: 'hidden',
  },
  shimmerOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: Radii.lg,
  },
  shimmerBand: {
    width: '45%',
    height: '100%',
  },
  shimmerGradient: {
    width: '100%',
  },
  gradientWrapper: {
    position: 'relative',
    borderRadius: Radii.lg,
    overflow: 'hidden',
  },
});
