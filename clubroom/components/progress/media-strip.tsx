import { memo, useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';

import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { PhotoAsset, VideoAsset } from '@/types/progress-types';
import { PhotoViewer } from './photo-viewer';
import { VideoPlayerOverlay } from './video-player-overlay';

interface MediaStripProps {
  photos: PhotoAsset[];
  video: VideoAsset | null;
  onPressOverflow?: () => void;
  maxVisible?: number;
}

type DisplayItem =
  | { id: string; type: 'photo'; photoIndex: number; thumbnailUri: string; capturedAt: string }
  | { id: string; type: 'video'; thumbnailUri: string; duration: number; capturedAt: string }
  | { id: string; type: 'overflow'; count: number };

type TimelineMediaItem = Extract<DisplayItem, { type: 'photo' | 'video' }>;

const THUMB_SIZE = 80;

function sortByCapturedAtDesc<T extends { capturedAt: string }>(items: T[]): T[] {
  return [...items].sort(
    (left, right) => new Date(right.capturedAt).getTime() - new Date(left.capturedAt).getTime(),
  );
}

function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export const MediaStrip = memo(function MediaStrip({
  photos,
  video,
  onPressOverflow,
  maxVisible = 4,
}: MediaStripProps) {
  const { colors } = useTheme();
  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [videoVisible, setVideoVisible] = useState(false);

  const sortedPhotos = useMemo(() => sortByCapturedAtDesc(photos), [photos]);
  const hasMedia = sortedPhotos.length > 0 || Boolean(video);

  const displayItems = useMemo<DisplayItem[]>(() => {
    const sessionItems: TimelineMediaItem[] = [
      ...sortedPhotos.map((photo, index) => ({
        id: `photo_${photo.uri}`,
        type: 'photo' as const,
        photoIndex: index,
        thumbnailUri: photo.thumbnailUri,
        capturedAt: photo.capturedAt,
      })),
    ];

    if (video) {
      sessionItems.push({
        id: `video_${video.uri}`,
        type: 'video',
        thumbnailUri: video.thumbnailUri,
        duration: video.duration,
        capturedAt: video.capturedAt,
      });
    }

    const sorted: TimelineMediaItem[] = [...sessionItems].sort(
      (left, right) =>
        new Date(right.capturedAt).getTime() - new Date(left.capturedAt).getTime(),
    );

    if (sorted.length <= maxVisible) {
      return sorted;
    }

    const visible = sorted.slice(0, Math.max(1, maxVisible - 1));
    return [
      ...visible,
      {
        id: 'overflow',
        type: 'overflow',
        count: sorted.length - visible.length,
      },
    ];
  }, [maxVisible, sortedPhotos, video]);

  const handlePress = useCallback(
    (item: DisplayItem) => {
      if (item.type === 'photo') {
        setActivePhotoIndex(item.photoIndex);
        setPhotoViewerVisible(true);
        return;
      }
      if (item.type === 'video') {
        setVideoVisible(true);
        return;
      }
      onPressOverflow?.();
    },
    [onPressOverflow],
  );

  const renderItem = useCallback(
    ({ item }: { item: DisplayItem }) => {
      if (item.type === 'overflow') {
        return (
          <Clickable
            style={[
              styles.thumb,
              styles.overflow,
              {
                borderColor: colors.border,
                backgroundColor: withAlpha(colors.border, 0.26),
              },
            ]}
            onPress={() => handlePress(item)}
            accessibilityLabel={`Open ${item.count} more media items`}
            accessibilityRole="button"
          >
            <ThemedText style={styles.overflowText}>+{item.count}</ThemedText>
          </Clickable>
        );
      }

      return (
        <Clickable
          style={[
            styles.thumb,
            {
              borderColor: withAlpha(colors.border, 0.9),
            },
          ]}
          onPress={() => handlePress(item)}
          accessibilityLabel={item.type === 'video' ? 'Open session video' : 'Open session photo'}
          accessibilityRole="button"
        >
          <ExpoImage source={{ uri: item.thumbnailUri }} style={styles.image} contentFit="cover" />
          {item.type === 'video' ? (
            <>
              <Row
                align="center"
                justify="center"
                style={[
                  styles.playOverlay,
                  {
                    backgroundColor: withAlpha(colors.text, 0.4),
                  },
                ]}
              >
                <Ionicons name="play" size={18} color={colors.onPrimary} />
              </Row>
              <Row style={[styles.durationBadge, { backgroundColor: withAlpha(colors.text, 0.64) }]}>
                <ThemedText style={[styles.durationText, { color: colors.onPrimary }]}>
                  {formatDuration(item.duration)}
                </ThemedText>
              </Row>
            </>
          ) : null}
        </Clickable>
      );
    },
    [colors.border, colors.onPrimary, colors.text, handlePress],
  );

  if (!hasMedia) {
    return null;
  }

  return (
    <>
      <FlatList
        data={displayItems}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
      />

      <PhotoViewer
        visible={photoViewerVisible}
        photos={sortedPhotos}
        initialIndex={activePhotoIndex}
        onClose={() => setPhotoViewerVisible(false)}
      />
      <VideoPlayerOverlay
        visible={videoVisible}
        video={video}
        onClose={() => setVideoVisible(false)}
      />
    </>
  );
});

const styles = StyleSheet.create({
  list: {
    gap: Spacing.xs,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: Radii.sm,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: Radii.pill,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.xxs,
    minHeight: 16,
    justifyContent: 'center',
  },
  durationText: {
    ...Typography.micro,
    fontSize: 8,
    lineHeight: 10,
    textTransform: 'none',
  },
  overflow: {
    borderStyle: 'dashed',
  },
  overflowText: {
    ...Typography.bodySmallSemiBold,
  },
});
