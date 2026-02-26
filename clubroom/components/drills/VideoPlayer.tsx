import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode, type AVPlaybackStatus } from 'expo-av';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { styles } from './video-player-styles';

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
  title,
  autoPlay = false,
  onComplete,
  height = 240,
}: VideoPlayerProps) {
  const { colors: palette } = useTheme();
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleStatusUpdate = useCallback(
    (status: AVPlaybackStatus) => {
      if (!status.isLoaded) {
        if (status.error) {
          setError('Video playback unavailable');
          setIsLoading(false);
        }
        return;
      }

      setError(null);
      setIsLoading(false);
      setIsPlaying(status.isPlaying);

      if (status.didJustFinish) {
        setIsPlaying(false);
        onComplete?.();
      }
    },
    [onComplete],
  );

  const togglePlayback = useCallback(async () => {
    if (!videoUrl || error) return;
    try {
      if (isPlaying) {
        await videoRef.current?.pauseAsync();
      } else {
        await videoRef.current?.playAsync();
      }
    } catch {
      setError('Video playback unavailable');
    }
  }, [error, isPlaying, videoUrl]);

  const overlayBg = useMemo(() => withAlpha(palette.background, 0.88), [palette.background]);

  if (!videoUrl?.trim()) {
    return <NoVideoPlaceholder message="No video available" height={height} />;
  }

  return (
    <View style={[styles.container, { height, backgroundColor: palette.surface }]}>
      <Video
        ref={videoRef}
        source={{ uri: videoUrl }}
        style={styles.video}
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay={autoPlay}
        onPlaybackStatusUpdate={handleStatusUpdate}
        useNativeControls={false}
      />

      {isLoading && !error ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={palette.tint} />
        </View>
      ) : null}

      {error ? (
        <View style={styles.controlsOverlay}>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={28} color={palette.error} />
            <ThemedText style={[styles.errorText, { color: palette.muted }]}>
              {error}
            </ThemedText>
          </View>
        </View>
      ) : (
        <Clickable
          onPress={togglePlayback}
          style={[styles.controlsOverlay]}
          accessibilityLabel={isPlaying ? 'Pause video' : 'Play video'}
        >
          <View style={[styles.playButton, { backgroundColor: overlayBg }]}>
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={32}
              color={palette.tint}
            />
          </View>
        </Clickable>
      )}

      {title ? (
        <View style={[styles.titleOverlay, { backgroundColor: withAlpha(palette.background, 0.55) }]}>
          <ThemedText numberOfLines={1} style={[styles.titleText, { color: palette.text }]}>
            {title}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

export function NoVideoPlaceholder({
  message = 'No video available',
  height = 200,
}: {
  message?: string;
  height?: number;
}) {
  const { colors: palette } = useTheme();
  return (
    <View
      style={[
        styles.noVideoContainer,
        { height, backgroundColor: withAlpha(palette.text, 0.05) },
      ]}
    >
      <Ionicons name="videocam-off-outline" size={36} color={palette.muted} />
      <ThemedText style={{ color: palette.muted, marginTop: Spacing.xs }}>
        {message}
      </ThemedText>
    </View>
  );
}
