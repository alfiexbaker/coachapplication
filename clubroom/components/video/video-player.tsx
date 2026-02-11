import { useState, useRef, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut, useSharedValue, withTiming } from 'react-native-reanimated';
import Slider from '@react-native-community/slider';

import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { VideoAnnotation } from '@/constants/types';
import { formatTime, getMarkerColor } from './video-player-sections';

// Re-export for backward compat
export { AnnotationTimeline } from './video-player-sections';

interface VideoPlayerProps {
  videoUrl: string;
  thumbnailUrl?: string;
  duration?: number;
  annotations?: VideoAnnotation[];
  onAnnotationPress?: (annotation: VideoAnnotation) => void;
  onTimeUpdate?: (currentTime: number) => void;
  initialPosition?: number;
  autoPlay?: boolean;
}

export function VideoPlayer({
  videoUrl,
  thumbnailUrl,
  duration = 0,
  annotations = [],
  onAnnotationPress,
  onTimeUpdate,
  initialPosition = 0,
  autoPlay = false,
}: VideoPlayerProps) {
  const { colors: palette } = useTheme();
  const videoRef = useRef<Video>(null);

  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [currentTime, setCurrentTime] = useState(initialPosition);
  const [videoDuration, setVideoDuration] = useState(duration);
  const [isBuffering, setIsBuffering] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const controlsOpacity = useSharedValue(1);

  const handlePlaybackStatusUpdate = useCallback(
    (status: AVPlaybackStatus) => {
      if (!status.isLoaded) {
        setIsBuffering(true);
        return;
      }

      setIsBuffering(false);
      setIsPlaying(status.isPlaying);
      setCurrentTime(status.positionMillis / 1000);
      if (status.durationMillis) {
        setVideoDuration(status.durationMillis / 1000);
      }
      onTimeUpdate?.(status.positionMillis / 1000);
    },
    [onTimeUpdate],
  );

  const togglePlayPause = async () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      await videoRef.current.pauseAsync();
    } else {
      await videoRef.current.playAsync();
    }
  };

  const seekTo = async (seconds: number) => {
    if (!videoRef.current) return;
    await videoRef.current.setPositionAsync(seconds * 1000);
  };

  const skipForward = async () => {
    await seekTo(Math.min(currentTime + 10, videoDuration));
  };

  const skipBackward = async () => {
    await seekTo(Math.max(currentTime - 10, 0));
  };

  const toggleControls = () => {
    setShowControls((prev) => !prev);
    controlsOpacity.value = withTiming(showControls ? 0 : 1, { duration: 200 });
  };

  const handleSliderChange = (value: number) => {
    seekTo(value);
  };

  const getAnnotationPosition = (timestamp: number): number => {
    if (videoDuration === 0) return 0;
    return (timestamp / videoDuration) * 100;
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.text }]}>
      <Clickable
        onPress={toggleControls}
        style={styles.videoContainer}
        accessibilityRole="button"
        accessibilityLabel="Toggle video controls"
      >
        <Video
          ref={videoRef}
          source={{ uri: videoUrl }}
          style={styles.video}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={autoPlay}
          isLooping={false}
          posterSource={thumbnailUrl ? { uri: thumbnailUrl } : undefined}
          usePoster={!!thumbnailUrl}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        />

        {isBuffering && (
          <View
            style={[styles.bufferingOverlay, { backgroundColor: withAlpha(palette.text, 0.5) }]}
          >
            <Ionicons name="hourglass" size={40} color={palette.onPrimary} />
          </View>
        )}

        {showControls && (
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
            style={[styles.controlsOverlay, { backgroundColor: withAlpha(palette.text, 0.4) }]}
          >
            <Row flex align="center" justify="center" gap="xl">
              <Clickable
                onPress={skipBackward}
                style={[styles.skipButton, { backgroundColor: withAlpha(palette.text, 0.3) }]}
              >
                <Ionicons name="play-back" size={28} color={palette.onPrimary} />
              </Clickable>
              <Clickable
                onPress={togglePlayPause}
                style={[styles.playPauseButton, { backgroundColor: withAlpha(palette.text, 0.5) }]}
              >
                <Ionicons name={isPlaying ? 'pause' : 'play'} size={40} color={palette.onPrimary} />
              </Clickable>
              <Clickable
                onPress={skipForward}
                style={[styles.skipButton, { backgroundColor: withAlpha(palette.text, 0.3) }]}
              >
                <Ionicons name="play-forward" size={28} color={palette.onPrimary} />
              </Clickable>
            </Row>

            <View style={styles.bottomControls}>
              <View style={styles.progressContainer}>
                {annotations.map((annotation) => (
                  <Clickable
                    key={annotation.id}
                    onPress={() => {
                      seekTo(annotation.timestamp);
                      onAnnotationPress?.(annotation);
                    }}
                    style={[
                      styles.annotationMarker,
                      {
                        left: `${getAnnotationPosition(annotation.timestamp)}%`,
                        backgroundColor: getMarkerColor(annotation.type, palette),
                      },
                    ]}
                  >
                    <></>
                  </Clickable>
                ))}

                <Slider
                  style={styles.slider}
                  value={currentTime}
                  minimumValue={0}
                  maximumValue={videoDuration}
                  onSlidingComplete={handleSliderChange}
                  minimumTrackTintColor={palette.tint}
                  maximumTrackTintColor={withAlpha(palette.onPrimary, 0.3)}
                  thumbTintColor={palette.tint}
                />
              </View>

              <Row justify="between" style={styles.timeRow}>
                <ThemedText
                  style={styles.timeText}
                  lightColor={palette.onPrimary}
                  darkColor={palette.onPrimary}
                >
                  {formatTime(currentTime)}
                </ThemedText>
                <ThemedText
                  style={styles.timeText}
                  lightColor={palette.onPrimary}
                  darkColor={palette.onPrimary}
                >
                  {formatTime(videoDuration)}
                </ThemedText>
              </Row>
            </View>
          </Animated.View>
        )}
      </Clickable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', aspectRatio: 16 / 9, borderRadius: Radii.lg, overflow: 'hidden' },
  videoContainer: { flex: 1 },
  video: { flex: 1 },
  bufferingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlsOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
  playPauseButton: {
    width: 72,
    height: 72,
    borderRadius: Radii['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButton: {
    width: 48,
    height: 48,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomControls: { padding: Spacing.md, gap: Spacing.xs },
  progressContainer: { position: 'relative', height: 30, justifyContent: 'center' },
  slider: { width: '100%', height: 30 },
  annotationMarker: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: Radii.xs,
    top: 11,
    marginLeft: -4,
    zIndex: 10,
  },
  timeRow: { paddingHorizontal: Spacing.xs },
  timeText: { ...Typography.caption },
});
