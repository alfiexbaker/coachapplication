import { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';

import { Column } from '@/components/primitives/column';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { PageHeader } from '@/components/primitives/page-header';
import { ThemedText } from '@/components/themed-text';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-states';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useMediaGallery, type MediaGalleryItem } from '@/hooks/use-media-gallery';
import { PhotoViewer, type PhotoViewerItem } from '@/components/progress/photo-viewer';
import { VideoPlayerOverlay } from '@/components/progress/video-player-overlay';
import type { VideoAsset } from '@/types/progress-types';

function normalizeParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export default function MediaGalleryScreen() {
  const { colors } = useTheme();
  const { athleteId } = useLocalSearchParams<{ athleteId?: string | string[] }>();
  const athleteIdParam = useMemo(() => normalizeParam(athleteId), [athleteId]);

  const { loading, status, error, refreshing, onRefresh, retry, groups, items } =
    useMediaGallery(athleteIdParam);

  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [activeVideo, setActiveVideo] = useState<VideoAsset | null>(null);

  const photos = useMemo<PhotoViewerItem[]>(
    () =>
      items
        .filter((item) => item.type === 'photo')
        .map((item) => ({
          uri: item.uri,
          thumbnailUri: item.thumbnailUri,
          capturedAt: item.capturedAt,
        })),
    [items],
  );

  const handlePressItem = useCallback(
    (item: MediaGalleryItem) => {
      if (item.type === 'photo') {
        const photoIndex = photos.findIndex((photo) => photo.uri === item.uri);
        setActivePhotoIndex(photoIndex < 0 ? 0 : photoIndex);
        setPhotoViewerVisible(true);
        return;
      }

      setActiveVideo({
        uri: item.uri,
        thumbnailUri: item.thumbnailUri,
        duration: item.duration ?? 0,
        capturedAt: item.capturedAt,
      });
    },
    [photos],
  );

  const renderGalleryItem = useCallback(
    ({ item }: { item: MediaGalleryItem }) => (
      <Clickable
        style={[styles.tile, { borderColor: withAlpha(colors.border, 0.9) }]}
        onPress={() => handlePressItem(item)}
        accessibilityLabel={item.type === 'video' ? 'Open video' : 'Open photo'}
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
                  backgroundColor: withAlpha(colors.text, 0.45),
                },
              ]}
            >
              <Ionicons name="play" size={20} color={colors.onPrimary} />
            </Row>
            <Row style={[styles.durationBadge, { backgroundColor: withAlpha(colors.text, 0.64) }]}>
              <ThemedText style={[styles.durationText, { color: colors.onPrimary }]}>
                {formatDuration(item.duration ?? 0)}
              </ThemedText>
            </Row>
          </>
        ) : null}
      </Clickable>
    ),
    [colors.border, colors.onPrimary, colors.text, handlePressItem],
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <PageHeader title="Media Gallery" showBack centerTitle onBackPress={() => router.back()} />

      {loading ? <LoadingState variant="card" /> : null}

      {status === 'error' ? (
        <ErrorState message={error?.message ?? 'Unable to load media gallery.'} onRetry={retry} />
      ) : null}

      {status === 'empty' ? (
        <EmptyState
          icon="images-outline"
          title="No media yet"
          message="Photos and videos from sessions will appear here."
        />
      ) : null}

      {status === 'success' ? (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          <Column gap="md">
            {groups.map((group) => (
              <Column key={group.key} gap="xs">
                <ThemedText style={styles.monthTitle}>{group.label}</ThemedText>
                <FlatList
                  accessibilityRole="list"
                  data={group.items}
                  keyExtractor={(item) => item.id}
                  renderItem={renderGalleryItem}
                  numColumns={4}
                  scrollEnabled={false}
                  columnWrapperStyle={styles.columnWrap}
                />
              </Column>
            ))}
          </Column>
        </ScrollView>
      ) : null}

      <PhotoViewer
        visible={photoViewerVisible}
        photos={photos}
        initialIndex={activePhotoIndex}
        onClose={() => setPhotoViewerVisible(false)}
      />
      <VideoPlayerOverlay
        visible={Boolean(activeVideo)}
        video={activeVideo}
        onClose={() => setActiveVideo(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingBottom: Spacing['3xl'],
  },
  monthTitle: {
    ...Typography.bodySemiBold,
  },
  columnWrap: {
    justifyContent: 'space-between',
  },
  tile: {
    width: '23%',
    aspectRatio: 1,
    borderRadius: Radii.md,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
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
    bottom: Spacing.xxs,
    right: Spacing.xxs,
    borderRadius: Radii.sm,
    minHeight: 16,
    paddingHorizontal: Spacing.xxs,
    justifyContent: 'center',
  },
  durationText: {
    ...Typography.micro,
    fontSize: Typography.micro.fontSize,
    lineHeight: 10,
    textTransform: 'none',
  },
});
