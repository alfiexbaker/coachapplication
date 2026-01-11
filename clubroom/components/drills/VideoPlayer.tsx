/**
 * VideoPlayer Component
 *
 * A simple video player component for displaying drill demonstration videos.
 * Uses expo-av for video playback with basic controls.
 */

import { Ionicons } from '@expo/vector-icons';
import { useState, useRef, useCallback } from 'react';
import { StyleSheet, View, Image, ActivityIndicator } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { scaleFont } from '@/utils/scale';

interface VideoPlayerProps {
  /** URL of the video to play */
  videoUrl: string;
  /** Optional thumbnail URL to show before playing */
  thumbnailUrl?: string;
  /** Title of the video */
  title?: string;
  /** Duration of the video in minutes */
  duration?: number;
  /** Whether to autoplay the video */
  autoPlay?: boolean;
  /** Callback when video playback completes */
  onComplete?: () => void;
  /** Height of the video player */
  height?: number;
}

/**
 * Video player component with play/pause controls and progress indicator.
 */
export function VideoPlayer({
  videoUrl,
  thumbnailUrl,
  title,
  duration,
  autoPlay = false,
  onComplete,
  height = 240,
}: VideoPlayerProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isLoading, setIsLoading] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [hasStarted, setHasStarted] = useState(autoPlay);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle video playback status updates
   */
  const handlePlaybackStatusUpdate = useCallback(
    (status: AVPlaybackStatus) => {
      if (!status.isLoaded) {
        if (status.error) {
          setError('Failed to load video');
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(status.isBuffering);
      setIsPlaying(status.isPlaying);

      if (status.durationMillis) {
        setTotalDuration(status.durationMillis);
        setCurrentTime(status.positionMillis);
        setProgress(status.positionMillis / status.durationMillis);
      }

      if (status.didJustFinish) {
        setIsPlaying(false);
        setShowControls(true);
        onComplete?.();
      }
    },
    [onComplete]
  );

  /**
   * Toggle play/pause
   */
  const handlePlayPause = useCallback(async () => {
    if (!videoRef.current) return;

    if (!hasStarted) {
      setHasStarted(true);
      setIsLoading(true);
    }

    if (isPlaying) {
      await videoRef.current.pauseAsync();
    } else {
      await videoRef.current.playAsync();
    }

    // Auto-hide controls after playing
    if (!isPlaying) {
      setTimeout(() => setShowControls(false), 3000);
    }
  }, [isPlaying, hasStarted]);

  /**
   * Toggle controls visibility
   */
  const handleToggleControls = useCallback(() => {
    setShowControls((prev) => !prev);
    if (!showControls && isPlaying) {
      setTimeout(() => setShowControls(false), 3000);
    }
  }, [showControls, isPlaying]);

  /**
   * Format time in mm:ss
   */
  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Error state
  if (error) {
    return (
      <View style={[styles.container, { height, backgroundColor: palette.surface }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={palette.error} />
          <ThemedText style={[styles.errorText, { color: palette.error }]}>{error}</ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }]}>
      {/* Video */}
      {hasStarted ? (
        <Video
          ref={videoRef}
          source={{ uri: videoUrl }}
          style={styles.video}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={autoPlay}
          isLooping={false}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          useNativeControls={false}
        />
      ) : (
        // Thumbnail before playing
        thumbnailUrl ? (
          <Image source={{ uri: thumbnailUrl }} style={styles.thumbnail} />
        ) : (
          <View style={[styles.placeholder, { backgroundColor: palette.surfaceSecondary }]} />
        )
      )}

      {/* Tap area for controls */}
      <Clickable style={styles.controlsOverlay} onPress={handleToggleControls}>
        {/* Loading indicator */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#FFFFFF" />
          </View>
        )}

        {/* Play/Pause button */}
        {(showControls || !hasStarted) && !isLoading && (
          <Clickable onPress={handlePlayPause} style={styles.playButton}>
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={32}
              color="#FFFFFF"
            />
          </Clickable>
        )}

        {/* Bottom controls */}
        {showControls && hasStarted && (
          <View style={styles.bottomControls}>
            {/* Progress bar */}
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBackground}>
                <View
                  style={[styles.progressBarFill, { width: `${progress * 100}%` }]}
                />
              </View>
            </View>

            {/* Time and duration */}
            <View style={styles.timeContainer}>
              <ThemedText style={styles.timeText}>
                {formatTime(currentTime)}
              </ThemedText>
              <ThemedText style={styles.timeText}>
                {formatTime(totalDuration)}
              </ThemedText>
            </View>
          </View>
        )}

        {/* Title overlay */}
        {title && !hasStarted && (
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
        )}
      </Clickable>
    </View>
  );
}

/**
 * Placeholder component when no video is available
 */
interface NoVideoPlaceholderProps {
  /** Message to display */
  message?: string;
  /** Height of the placeholder */
  height?: number;
}

export function NoVideoPlaceholder({
  message = 'No video available',
  height = 200,
}: NoVideoPlaceholderProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <View style={[styles.noVideoContainer, { height, backgroundColor: palette.surfaceSecondary }]}>
      <Ionicons name="videocam-off-outline" size={48} color={palette.muted} />
      <ThemedText style={[styles.noVideoText, { color: palette.muted }]}>
        {message}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: Radii.md,
    overflow: 'hidden',
    backgroundColor: '#000000',
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  progressBarContainer: {
    width: '100%',
    marginBottom: 8,
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    color: '#FFFFFF',
    fontSize: scaleFont(12),
    fontWeight: '500',
  },
  titleOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleText: {
    color: '#FFFFFF',
    fontSize: scaleFont(14),
    fontWeight: '600',
    flex: 1,
  },
  durationText: {
    color: 'rgba(255, 255, 255, 0.8)',
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
