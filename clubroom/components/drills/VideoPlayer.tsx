/**
 * VideoPlayer Component
 *
 * A simple video player component for displaying drill demonstration videos.
 * Uses expo-video for playback with basic controls.
 */

import { useMemo, useState, useCallback } from 'react';
import { View, Image } from 'react-native';
import { useEventListener } from 'expo';
import { VideoView, useVideoPlayer } from 'expo-video';

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

  const source = useMemo(() => ({ uri: videoUrl }), [videoUrl]);
  const player = useVideoPlayer(source, (instance) => {
    instance.loop = false;
    instance.timeUpdateEventInterval = 0.25;
    if (autoPlay) {
      instance.play();
    }
  });

  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isLoading, setIsLoading] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [hasStarted, setHasStarted] = useState(autoPlay);
  const [error, setError] = useState<string | null>(null);

  useEventListener(player, 'playingChange', ({ isPlaying: playing }) => {
    setIsPlaying(playing);
  });

  useEventListener(player, 'statusChange', ({ status, error: playerError }) => {
    setIsLoading(status === 'loading');
    if (status === 'error') {
      setError(playerError?.message || 'Failed to load video');
      setIsLoading(false);
    }
  });

  useEventListener(player, 'sourceLoad', ({ duration: loadedDuration }) => {
    const durationMs = loadedDuration > 0 ? loadedDuration * 1000 : 0;
    setTotalDuration(durationMs);
  });

  useEventListener(player, 'timeUpdate', ({ currentTime: timeSeconds }) => {
    const timeMs = timeSeconds * 1000;
    setCurrentTime(timeMs);
    setProgress(totalDuration > 0 ? timeMs / totalDuration : 0);
  });

  useEventListener(player, 'playToEnd', () => {
    setIsPlaying(false);
    setShowControls(true);
    onComplete?.();
  });

  const handlePlayPause = useCallback(() => {
    if (!hasStarted) {
      setHasStarted(true);
      setIsLoading(true);
    }

    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }

    if (!player.playing) {
      setTimeout(() => setShowControls(false), 3000);
    }
  }, [hasStarted, player]);

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
        <VideoView
          player={player}
          style={styles.video}
          contentFit="contain"
          nativeControls={false}
          allowsFullscreen={false}
          allowsPictureInPicture={false}
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
