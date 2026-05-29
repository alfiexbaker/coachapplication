import { Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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

export const VideoPlayerOverlay = function VideoPlayerOverlay({
  visible,
  video,
  onClose,
}: VideoPlayerOverlayProps) {
  const { colors } = useTheme();

  const handleShare = async () => {
    if (!video) {
      return;
    }
    await mediaService.shareMedia(video.uri, 'video');
  };

  const durationLabel = formatDuration(video?.duration ?? 0);

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

        <Column align="center" justify="center" gap="sm" style={styles.playerWrap}>
          <Row
            align="center"
            justify="center"
            style={[styles.playButton, { backgroundColor: withAlpha(colors.background, 0.22) }]}
          >
            <Ionicons name="videocam-off-outline" size={30} color={colors.onPrimary} />
          </Row>
          <ThemedText style={[styles.unavailableText, { color: colors.onPrimary }]}>
            Video playback unavailable
          </ThemedText>
        </Column>

        <Column gap="xxs" style={styles.footer}>
          <Row
            style={[styles.progressTrack, { backgroundColor: withAlpha(colors.onPrimary, 0.25) }]}
          >
            <Row
              style={[
                styles.progressFill,
                {
                  width: '0%',
                  backgroundColor: colors.onPrimary,
                },
              ]}
            />
          </Row>
          <Row align="center" justify="between">
            <ThemedText style={[styles.durationText, { color: withAlpha(colors.onPrimary, 0.86) }]}>
              0:00
            </ThemedText>
            <ThemedText style={[styles.durationText, { color: withAlpha(colors.onPrimary, 0.86) }]}>
              {durationLabel}
            </ThemedText>
          </Row>
        </Column>
      </Column>
    </Modal>
  );
};

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
  playButton: {
    width: 72,
    height: 72,
    borderRadius: Radii.pill,
  },
  unavailableText: {
    ...Typography.bodySmallSemiBold,
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
