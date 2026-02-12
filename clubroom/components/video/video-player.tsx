import { useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
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
  thumbnailUrl: _thumbnailUrl,
  duration = 0,
  annotations = [],
  onAnnotationPress,
  onTimeUpdate,
  initialPosition = 0,
  autoPlay = false,
}: VideoPlayerProps) {
  const { colors: palette } = useTheme();
  const source = useMemo(() => ({ uri: videoUrl }), [videoUrl]);
  const player = useVideoPlayer(source, (instance) => {
    instance.loop = false;
    instance.timeUpdateEventInterval = 0.25;
    if (initialPosition > 0) {
      instance.currentTime = initialPosition;
    }
    if (autoPlay) {
      instance.play();
    }
  });

  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [currentTime, setCurrentTime] = useState(initialPosition);
  const [videoDuration, setVideoDuration] = useState(duration);
  const [isBuffering, setIsBuffering] = useState(false);
  const [showControls, setShowControls] = useState(true);

  useEventListener(player, 'playingChange', ({ isPlaying: playing }) => {
    setIsPlaying(playing);
  });

  useEventListener(player, 'timeUpdate', ({ currentTime: time }) => {
    setCurrentTime(time);
    onTimeUpdate?.(time);
  });

  useEventListener(player, 'sourceLoad', ({ duration: loadedDuration }) => {
    if (loadedDuration > 0) {
      setVideoDuration(loadedDuration);
    }
  });

  useEventListener(player, 'statusChange', ({ status }) => {
    setIsBuffering(status === 'loading');
  });

  useEventListener(player, 'playToEnd', () => {
    setIsPlaying(false);
  });

  const togglePlayPause = () => {
    if (player.playing) {
      player.pause();
      return;
    }
    player.play();
  };

  const seekTo = (seconds: number) => {
    player.currentTime = seconds;
    setCurrentTime(seconds);
    onTimeUpdate?.(seconds);
  };

  const skipForward = () => {
    seekTo(Math.min(currentTime + 10, videoDuration));
  };

  const skipBackward = () => {
    seekTo(Math.max(currentTime - 10, 0));
  };

  const toggleControls = () => {
    setShowControls((prev) => !prev);
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
        <VideoView
          player={player}
          style={styles.video}
          contentFit="contain"
          nativeControls={false}
          allowsFullscreen={false}
          allowsPictureInPicture={false}
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
