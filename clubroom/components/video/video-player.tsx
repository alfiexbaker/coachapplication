import { useState, useRef, useCallback } from 'react';
import { View, StyleSheet, Dimensions, Pressable } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut, useSharedValue, withTiming } from 'react-native-reanimated';
import Slider from '@react-native-community/slider';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii , Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { VideoAnnotation } from '@/constants/types';

Dimensions.get('window');

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

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
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
  }, [onTimeUpdate]);

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

  // Calculate annotation marker positions
  const getAnnotationPosition = (timestamp: number): number => {
    if (videoDuration === 0) return 0;
    return (timestamp / videoDuration) * 100;
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.text }]}>
      {/* Video Element */}
      <Pressable onPress={toggleControls} style={styles.videoContainer}>
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

        {/* Buffering Indicator */}
        {isBuffering && (
          <View style={styles.bufferingOverlay}>
            <Ionicons name="hourglass" size={40} color={palette.onPrimary} />
          </View>
        )}

        {/* Controls Overlay */}
        {showControls && (
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
            style={[styles.controlsOverlay]}
          >
            {/* Center Controls */}
            <View style={styles.centerControls}>
              <Clickable onPress={skipBackward} style={styles.skipButton}>
                <Ionicons name="play-back" size={28} color={palette.onPrimary} />
              </Clickable>

              <Clickable onPress={togglePlayPause} style={styles.playPauseButton}>
                <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
                  size={40}
                  color={palette.onPrimary}
                />
              </Clickable>

              <Clickable onPress={skipForward} style={styles.skipButton}>
                <Ionicons name="play-forward" size={28} color={palette.onPrimary} />
              </Clickable>
            </View>

            {/* Bottom Controls */}
            <View style={styles.bottomControls}>
              {/* Progress Bar with Annotations */}
              <View style={styles.progressContainer}>
                {/* Annotation Markers */}
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
                        backgroundColor:
                          annotation.type === 'HIGHLIGHT'
                            ? palette.success
                            : annotation.type === 'IMPROVEMENT'
                            ? palette.warning
                            : palette.info,
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
                  maximumTrackTintColor={withAlpha(palette.onPrimary, 0.30)}
                  thumbTintColor={palette.tint}
                />
              </View>

              {/* Time Display */}
              <View style={styles.timeRow}>
                <ThemedText style={styles.timeText} lightColor={palette.onPrimary} darkColor={palette.onPrimary}>
                  {formatTime(currentTime)}
                </ThemedText>
                <ThemedText style={styles.timeText} lightColor={palette.onPrimary} darkColor={palette.onPrimary}>
                  {formatTime(videoDuration)}
                </ThemedText>
              </View>
            </View>
          </Animated.View>
        )}
      </Pressable>
    </View>
  );
}

// Annotation Timeline Component
interface AnnotationTimelineProps {
  annotations: VideoAnnotation[];
  currentTime: number;
  duration: number;
  onSeek: (timestamp: number) => void;
}

export function AnnotationTimeline({
  annotations,
  currentTime,
  duration,
  onSeek,
}: AnnotationTimelineProps) {
  const { colors: palette } = useTheme();

  const getMarkerColor = (type: VideoAnnotation['type']) => {
    switch (type) {
      case 'HIGHLIGHT':
        return palette.success;
      case 'IMPROVEMENT':
        return palette.warning;
      case 'TECHNIQUE':
        return palette.tint;
      default:
        return palette.muted;
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.timeline}>
      <ThemedText type="defaultSemiBold" style={styles.timelineTitle}>
        Annotations ({annotations.length})
      </ThemedText>

      {annotations.length === 0 ? (
        <ThemedText style={[styles.noAnnotations, { color: palette.muted }]}>
          No annotations yet
        </ThemedText>
      ) : (
        <View style={styles.annotationsList}>
          {annotations.map((annotation) => {
            const isActive = Math.abs(currentTime - annotation.timestamp) < 2;

            return (
              <Clickable
                key={annotation.id}
                onPress={() => onSeek(annotation.timestamp)}
                style={[
                  styles.annotationItem,
                  {
                    backgroundColor: isActive ? withAlpha(getMarkerColor(annotation.type), 0.15) : palette.surface,
                    borderColor: isActive ? getMarkerColor(annotation.type) : palette.border,
                  },
                ]}
              >
                <View style={[styles.annotationDot, { backgroundColor: getMarkerColor(annotation.type) }]} />
                <View style={styles.annotationContent}>
                  <View style={styles.annotationHeader}>
                    <ThemedText type="defaultSemiBold" style={styles.annotationLabel}>
                      {annotation.label}
                    </ThemedText>
                    <ThemedText style={[styles.annotationTime, { color: palette.muted }]}>
                      {formatTime(annotation.timestamp)}
                    </ThemedText>
                  </View>
                  {annotation.note && (
                    <ThemedText style={[styles.annotationNote, { color: palette.muted }]}>
                      {annotation.note}
                    </ThemedText>
                  )}
                </View>
              </Clickable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: Radii.lg,
    overflow: 'hidden',
  },
  videoContainer: {
    flex: 1,
  },
  video: {
    flex: 1,
  },
  bufferingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.4)',
    justifyContent: 'space-between',
  },
  centerControls: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xl,
  },
  playPauseButton: {
    width: 72,
    height: 72,
    borderRadius: Radii['3xl'],
    backgroundColor: 'rgba(15,23,42,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButton: {
    width: 48,
    height: 48,
    borderRadius: Radii.xl,
    backgroundColor: 'rgba(15,23,42,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomControls: {
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  progressContainer: {
    position: 'relative',
    height: 30,
    justifyContent: 'center',
  },
  slider: {
    width: '100%',
    height: 30,
  },
  annotationMarker: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: Radii.xs,
    top: 11,
    marginLeft: -4,
    zIndex: 10,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xs,
  },
  timeText: { ...Typography.caption },
  timeline: {
    gap: Spacing.md,
  },
  timelineTitle: {
    marginBottom: Spacing.xs,
  },
  noAnnotations: {
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
  annotationsList: {
    gap: Spacing.sm,
  },
  annotationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.md,
  },
  annotationDot: {
    width: 10,
    height: 10,
    borderRadius: Radii.sm,
    marginTop: Spacing.xxs,
  },
  annotationContent: {
    flex: 1,
    gap: Spacing.xxs,
  },
  annotationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  annotationLabel: { ...Typography.bodySmall },
  annotationTime: { ...Typography.caption },
  annotationNote: { ...Typography.small },
});
