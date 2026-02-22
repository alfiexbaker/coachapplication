import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';

import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { mediaService } from '@/services/media-service';

export interface PhotoViewerItem {
  uri: string;
  thumbnailUri: string;
  capturedAt: string;
}

interface PhotoViewerProps {
  visible: boolean;
  photos: PhotoViewerItem[];
  initialIndex?: number;
  onClose: () => void;
}

export const PhotoViewer = memo(function PhotoViewer({
  visible,
  photos,
  initialIndex = 0,
  onClose,
}: PhotoViewerProps) {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const listRef = useRef<FlatList<PhotoViewerItem>>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!visible) {
      return;
    }
    const safeIndex = Math.max(0, Math.min(photos.length - 1, initialIndex));
    setActiveIndex(safeIndex);

    const timeout = setTimeout(() => {
      listRef.current?.scrollToIndex({ index: safeIndex, animated: false });
    }, 16);

    return () => clearTimeout(timeout);
  }, [initialIndex, photos.length, visible]);

  const handleMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(event.nativeEvent.contentOffset.x / Math.max(width, 1));
      setActiveIndex(Math.max(0, Math.min(photos.length - 1, next)));
    },
    [photos.length, width],
  );

  const handleShare = useCallback(async () => {
    const current = photos[activeIndex];
    if (!current) {
      return;
    }
    await mediaService.shareMedia(current.uri, 'photo');
  }, [activeIndex, photos]);

  const renderItem = useCallback(
    ({ item }: { item: PhotoViewerItem }) => (
      <ScrollView
        style={{ width, height }}
        contentContainerStyle={styles.zoomContent}
        maximumZoomScale={3}
        minimumZoomScale={1}
        centerContent
      >
        <ExpoImage
          source={{ uri: item.uri }}
          style={{ width, height: height * 0.8 }}
          contentFit="contain"
        />
      </ScrollView>
    ),
    [height, width],
  );

  if (!visible) {
    return null;
  }

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Row
        flex
        style={[
          styles.overlay,
          {
            backgroundColor: withAlpha(colors.text, 0.94),
          },
        ]}
      >
        <FlatList
          ref={listRef}
          data={photos}
          keyExtractor={(item) => item.uri}
          renderItem={renderItem}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleMomentumEnd}
          getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        />

        <Row style={styles.header} align="center" justify="between">
          <Clickable
            style={[styles.iconButton, { backgroundColor: withAlpha(colors.background, 0.22) }]}
            onPress={onClose}
            accessibilityLabel="Close photo viewer"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={20} color={colors.onPrimary} />
          </Clickable>

          <ThemedText style={[styles.counter, { color: colors.onPrimary }]}>
            {photos.length === 0 ? '0/0' : `${activeIndex + 1}/${photos.length}`}
          </ThemedText>

          <Clickable
            style={[styles.iconButton, { backgroundColor: withAlpha(colors.background, 0.22) }]}
            onPress={() => {
              void handleShare();
            }}
            accessibilityLabel="Share photo"
            accessibilityRole="button"
          >
            <Ionicons name="share-social-outline" size={18} color={colors.onPrimary} />
          </Clickable>
        </Row>
      </Row>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    position: 'relative',
  },
  header: {
    position: 'absolute',
    top: Spacing.lg,
    left: Spacing.md,
    right: Spacing.md,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: {
    ...Typography.bodySmallSemiBold,
  },
  zoomContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
