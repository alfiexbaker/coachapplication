/**
 * VideoPlayer Component
 *
 * A simple video player component for displaying drill demonstration videos.
 * Uses expo-av for video playback with basic controls.
 */

import { useState, useRef, useCallback } from 'react';
import { View, Image } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';

import { Clickable } from '@/components/primitives/clickable';
import { useTheme } from '@/hooks/useTheme';

import {
  VideoErrorState,
  VideoBottomControls,
  VideoTitleOverlay,
  VideoPlayButton,
  VideoLoadingOverlay,
  NoVideoPlaceholderInner,
  styles,
} from './video-player-sections';

interface VideoPlayerProps {
  videoUrl: string;
  thumbnailUrl?: string;
  title?: string;
  duration?: number;
  autoPlay?: boolean;
  onComplete?: () => void;
  height?: number;
}

export function VideoPlayer({
  videoUrl,
  thumbnailUrl,
  title,
  duration,
  autoPlay = false,
  onComplete,
  height = 240,
}: VideoPlayerProps) {
  const { colors: palette } = useTheme();

  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isLoading, setIsLoading] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [hasStarted, setHasStarted] = useState(autoPlay);
  const [error, setError] = useState<string | null>(null);

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

    if (!isPlaying) {
      setTimeout(() => setShowControls(false), 3000);
    }
  }, [isPlaying, hasStarted]);

  const handleToggleControls = useCallback(() => {
    setShowControls((prev) => !prev);
    if (!showControls && isPlaying) {
      setTimeout(() => setShowControls(false), 3000);
    }
  }, [showControls, isPlaying]);

  if (error) {
    return <VideoErrorState error={error} height={height} palette={palette} />;
  }

  return (
    <View style={[styles.container, { height }]}>
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
      ) : thumbnailUrl ? (
        <Image source={{ uri: thumbnailUrl }} style={styles.thumbnail} />
      ) : (
        <View style={[styles.placeholder, { backgroundColor: palette.surfaceSecondary }]} />
      )}

      <Clickable style={styles.controlsOverlay} onPress={handleToggleControls}>
        {isLoading && <VideoLoadingOverlay palette={palette} />}

        {(showControls || !hasStarted) && !isLoading && (
          <VideoPlayButton isPlaying={isPlaying} onPress={handlePlayPause} palette={palette} />
        )}

        {showControls && hasStarted && (
          <VideoBottomControls
            progress={progress}
            currentTime={currentTime}
            totalDuration={totalDuration}
            palette={palette}
          />
        )}

        {title && !hasStarted && (
          <VideoTitleOverlay title={title} duration={duration} palette={palette} />
        )}
      </Clickable>
    </View>
  );
}

// Backward compat export
export function NoVideoPlaceholder({
  message = 'No video available',
  height = 200,
}: {
  message?: string;
  height?: number;
}) {
  const { colors: palette } = useTheme();
  return <NoVideoPlaceholderInner message={message} height={height} palette={palette} />;
}
