/**
 * Extracted sub-components for VideoPlayer.
 *
 * formatTime — milliseconds → mm:ss.
 * VideoErrorState — error display (accepts palette).
 * NoVideoPlaceholderInner — placeholder when no video (accepts palette).
 */

import React, { memo } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import { scaleFont } from '@/utils/scale';

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function formatTime(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// ─── VideoErrorState ─────────────────────────────────────────────────────────

interface VideoErrorStateProps {
  error: string;
  height: number;
  palette: ThemeColors;
}

export const VideoErrorState = memo(function VideoErrorState({
  error,
  height,
  palette,
}: VideoErrorStateProps) {
  return (
    <View style={[styles.container, { height, backgroundColor: palette.surface }]}>
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={palette.error} />
        <ThemedText style={[styles.errorText, { color: palette.error }]}>{error}</ThemedText>
      </View>
    </View>
  );
});

// ─── VideoBottomControls ─────────────────────────────────────────────────────

interface VideoBottomControlsProps {
  progress: number;
  currentTime: number;
  totalDuration: number;
  palette: ThemeColors;
}

export const VideoBottomControls = memo(function VideoBottomControls({
  progress,
  currentTime,
  totalDuration,
  palette,
}: VideoBottomControlsProps) {
  return (
    <View style={styles.bottomControls}>
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${progress * 100}%`, backgroundColor: palette.onPrimary },
            ]}
          />
        </View>
      </View>
      <View style={styles.timeContainer}>
        <ThemedText style={[styles.timeText, { color: palette.onPrimary }]}>
          {formatTime(currentTime)}
        </ThemedText>
        <ThemedText style={[styles.timeText, { color: palette.onPrimary }]}>
          {formatTime(totalDuration)}
        </ThemedText>
      </View>
    </View>
  );
});

// ─── VideoTitleOverlay ───────────────────────────────────────────────────────

interface VideoTitleOverlayProps {
  title: string;
  duration?: number;
}

export const VideoTitleOverlay = memo(function VideoTitleOverlay({
  title,
  duration,
}: VideoTitleOverlayProps) {
  return (
    <View style={styles.titleOverlay}>
      <ThemedText style={styles.titleText} numberOfLines={1}>
        {title}
      </ThemedText>
      {duration && (
        <ThemedText style={styles.durationText}>
          {duration} min
        </ThemedText>
      )}
    </View>
  );
});

// ─── VideoPlayButton ─────────────────────────────────────────────────────────

interface VideoPlayButtonProps {
  isPlaying: boolean;
  onPress: () => void;
  palette: ThemeColors;
}

export const VideoPlayButton = memo(function VideoPlayButton({
  isPlaying,
  onPress,
  palette,
}: VideoPlayButtonProps) {
  return (
    <Clickable onPress={onPress} style={styles.playButton}>
      <Ionicons
        name={isPlaying ? 'pause' : 'play'}
        size={32}
        color={palette.onPrimary}
      />
    </Clickable>
  );
});

// ─── VideoLoadingOverlay ─────────────────────────────────────────────────────

interface VideoLoadingOverlayProps {
  palette: ThemeColors;
}

export const VideoLoadingOverlay = memo(function VideoLoadingOverlay({
  palette,
}: VideoLoadingOverlayProps) {
  return (
    <View style={styles.loadingOverlay}>
      <ActivityIndicator size="large" color={palette.onPrimary} />
    </View>
  );
});

// ─── NoVideoPlaceholderInner ─────────────────────────────────────────────────

interface NoVideoPlaceholderInnerProps {
  message: string;
  height: number;
  palette: ThemeColors;
}

export const NoVideoPlaceholderInner = memo(function NoVideoPlaceholderInner({
  message,
  height,
  palette,
}: NoVideoPlaceholderInnerProps) {
  return (
    <View style={[styles.noVideoContainer, { height, backgroundColor: palette.surfaceSecondary }]}>
      <Ionicons name="videocam-off-outline" size={48} color={palette.muted} />
      <ThemedText style={[styles.noVideoText, { color: palette.muted }]}>
        {message}
      </ThemedText>
    </View>
  );
});

// ─── Styles ──────────────────────────────────────────────────────────────────

export const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: Radii.md,
    overflow: 'hidden',
    backgroundColor: '#000000', // Decorative: video player black background
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Decorative: video overlay
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: Radii['3xl'],
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Decorative: play button overlay
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Decorative: controls overlay
  },
  progressBarContainer: {
    width: '100%',
    marginBottom: 8,
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)', // Decorative: progress track
    borderRadius: Radii.xs,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: Radii.xs,
  },
  timeContainer: {
    flexDirection: 'row',
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Decorative: title overlay
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleText: {
    color: 'rgba(255, 255, 255, 1)', // Decorative: white text on video
    fontSize: scaleFont(14),
    fontWeight: '600',
    flex: 1,
  },
  durationText: {
    color: 'rgba(255, 255, 255, 0.8)', // Decorative: duration text on video
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
