import { StyleSheet } from 'react-native';

import { Spacing, Radii } from '@/constants/theme';
import { scaleFont } from '@/utils/scale';

export const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: Radii.md,
    overflow: 'hidden',
    backgroundColor: 'black',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholder: {
    width: '100%',
    height: '100%',
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: Radii['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.sm,
  },
  progressBarContainer: {
    width: '100%',
    marginBottom: 8,
  },
  progressBarBackground: {
    height: 4,
    borderRadius: Radii.xs,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: Radii.xs,
  },
  timeContainer: {
    justifyContent: 'space-between',
  },
  timeText: {
    fontSize: scaleFont(12),
    fontWeight: '500',
  },
  titleOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleText: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    flex: 1,
  },
  durationText: {
    fontSize: scaleFont(12),
    marginLeft: Spacing.sm,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  errorText: {
    fontSize: scaleFont(14),
  },
  noVideoContainer: {
    width: '100%',
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  noVideoText: {
    fontSize: scaleFont(14),
  },
});
