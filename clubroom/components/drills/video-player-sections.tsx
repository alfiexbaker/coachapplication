/**
 * Extracted sub-components for VideoPlayer.
 *
 * formatTime — milliseconds → mm:ss.
 * VideoErrorState — error display (accepts palette).
 * NoVideoPlaceholderInner — placeholder when no video (accepts palette).
 */

import React, { memo } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';
import { styles } from './video-player-styles';

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
    <View style={[styles.bottomControls, { backgroundColor: withAlpha(palette.text, 0.5) }]}>
      <View style={styles.progressBarContainer}>
        <View
          style={[
            styles.progressBarBackground,
            { backgroundColor: withAlpha(palette.onPrimary, 0.3) },
          ]}
        >
          <View
            style={[
              styles.progressBarFill,
              { width: `${progress * 100}%`, backgroundColor: palette.onPrimary },
            ]}
          />
        </View>
      </View>
      <Row style={styles.timeContainer}>
        <ThemedText style={[styles.timeText, { color: palette.onPrimary }]}>
          {formatTime(currentTime)}
        </ThemedText>
        <ThemedText style={[styles.timeText, { color: palette.onPrimary }]}>
          {formatTime(totalDuration)}
        </ThemedText>
      </Row>
    </View>
  );
});

// ─── VideoTitleOverlay ───────────────────────────────────────────────────────

interface VideoTitleOverlayProps {
  title: string;
  duration?: number;
  palette: ThemeColors;
}

export const VideoTitleOverlay = memo(function VideoTitleOverlay({
  title,
  duration,
  palette,
}: VideoTitleOverlayProps) {
  return (
    <Row style={[styles.titleOverlay, { backgroundColor: withAlpha(palette.text, 0.6) }]}>
      <ThemedText style={[styles.titleText, { color: palette.onPrimary }]} numberOfLines={1}>
        {title}
      </ThemedText>
      {duration && (
        <ThemedText style={[styles.durationText, { color: withAlpha(palette.onPrimary, 0.8) }]}>
          {duration} min
        </ThemedText>
      )}
    </Row>
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
    <Clickable
      onPress={onPress}
      accessibilityLabel={isPlaying ? 'Pause video' : 'Play video'}
      style={[styles.playButton, { backgroundColor: withAlpha(palette.text, 0.6) }]}
    >
      <Ionicons name={isPlaying ? 'pause' : 'play'} size={32} color={palette.onPrimary} />
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
    <View style={[styles.loadingOverlay, { backgroundColor: withAlpha(palette.text, 0.5) }]}>
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
      <ThemedText style={[styles.noVideoText, { color: palette.muted }]}>{message}</ThemedText>
    </View>
  );
});

export { styles };
