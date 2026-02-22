import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode, type AVPlaybackStatus } from 'expo-av';

import { Clickable } from '@/components/primitives/clickable';
import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { mediaService } from '@/services/media-service';
import type { VideoAsset } from '@/types/progress-types';

interface VideoPlayerOverlayProps {
  visible: boolean;
  video: VideoAsset | null;
  onClose: () => void;
}

function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export const VideoPlayerOverlay = memo(function VideoPlayerOverlay({
  visible,
  video,
  onClose,
}: VideoPlayerOverlayProps) {
  const { colors } = useTheme();
  const playerRef = useRef<Video>(null);
  const [status, setStatus] = useState<AVPlaybackStatus | null>(null);

  useEffect(() => {
    if (!visible || !video) {
      return;
    }
    const timeout = setTimeout(() => {
      void playerRef.current?.playAsync();
    }, 100);

    return () => clearTimeout(timeout);
  }, [video, visible]);

  const loadedStatus = status && status.isLoaded ? status : null;
  const isPlaying = loadedStatus ? loadedStatus.isPlaying : false;
  const fallbackDurationMillis = (video?.duration ?? 0) * 1000;
  const durationMillis = loadedStatus?.durationMillis ?? fallbackDurationMillis;
  const positionMillis = loadedStatus?.positionMillis ?? 0;
  const progress = durationMillis > 0 ? Math.max(0, Math.min(100, (positionMillis / durationMillis) * 100)) : 0;

  const handleTogglePlayback = useCallback(async () => {
    if (!playerRef.current) {
      return;
    }
    if (isPlaying) {
      await playerRef.current.pauseAsync();
    } else {
      await playerRef.current.playAsync();
    }
  }, [isPlaying]);

  const handleShare = useCallback(async () => {
    if (!video) {
      return;
    }
    await mediaService.shareMedia(video.uri, 'video');
  }, [video]);

  const durationLabel = useMemo(
    () => formatDuration(durationMillis > 0 ? durationMillis / 1000 : (video?.duration ?? 0)),
    [durationMillis, video?.duration],
  );

  if (!visible || !video) {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Column
        flex
        style={[
          styles.overlay,
          {
            backgroundColor: withAlpha(colors.text, 0.94),
          },
        ]}
      >
        <Row align="center" justify="between" style={styles.header}>
          <Clickable
            style={[styles.iconButton, { backgroundColor: withAlpha(colors.background, 0.22) }]}
            onPress={onClose}
            accessibilityLabel="Close video player"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={20} color={colors.onPrimary} />
          </Clickable>

          <Clickable
            style={[styles.iconButton, { backgroundColor: withAlpha(colors.background, 0.22) }]}
            onPress={() => {
              void handleShare();
            }}
            accessibilityLabel="Share video"
            accessibilityRole="button"
          >
            <Ionicons name="share-social-outline" size={18} color={colors.onPrimary} />
          </Clickable>
        </Row>

        <Clickable
          style={styles.playerWrap}
          onPress={() => {
            void handleTogglePlayback();
          }}
          accessibilityLabel={isPlaying ? 'Pause video' : 'Play video'}
          accessibilityRole="button"
        >
          <Video
            ref={playerRef}
            source={{ uri: video.uri }}
            style={styles.video}
            resizeMode={ResizeMode.CONTAIN}
            useNativeControls={false}
            onPlaybackStatusUpdate={setStatus}
            isLooping={false}
          />
          {!isPlaying ? (
            <Row
              align="center"
              justify="center"
              style={[styles.playButton, { backgroundColor: withAlpha(colors.text, 0.45) }]}
            >
              <Ionicons name="play" size={30} color={colors.onPrimary} />
            </Row>
          ) : null}
        </Clickable>

        <Column gap="xxs" style={styles.footer}>
          <Row style={[styles.progressTrack, { backgroundColor: withAlpha(colors.onPrimary, 0.25) }]}>
            <Row
              style={[
                styles.progressFill,
                {
                  width: `${progress}%`,
                  backgroundColor: colors.onPrimary,
                },
              ]}
            />
          </Row>
          <Row align="center" justify="between">
            <ThemedText style={[styles.durationText, { color: withAlpha(colors.onPrimary, 0.86) }]}>
              {formatDuration(positionMillis / 1000)}
            </ThemedText>
            <ThemedText style={[styles.durationText, { color: withAlpha(colors.onPrimary, 0.86) }]}>
              {durationLabel}
            </ThemedText>
          </Row>
        </Column>
      </Column>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    position: 'relative',
    justifyContent: 'center',
  },
  header: {
    position: 'absolute',
    top: Spacing.lg,
    left: Spacing.md,
    right: Spacing.md,
    zIndex: 10,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  playButton: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: Radii.pill,
  },
  footer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  progressTrack: {
    width: '100%',
    height: 4,
    borderRadius: Radii.pill,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radii.pill,
  },
  durationText: {
    ...Typography.caption,
  },
});
