import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { PhotoAsset, VideoAsset } from '@/types/progress-types';

interface MediaThumbnailStripProps {
  photos: PhotoAsset[];
  video: VideoAsset | null;
  onRemove: (uri: string) => void;
}

export const MediaThumbnailStrip = function MediaThumbnailStrip({
  photos,
  video,
  onRemove,
}: MediaThumbnailStripProps) {
  const { colors } = useTheme();

  if (photos.length === 0 && !video) {
    return null;
  }

  return (
    <Column gap="xs">
      <ThemedText style={[styles.label, { color: colors.muted }]}>Attached media</ThemedText>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Row gap="xs">
          {photos.map((photo) => (
            <View key={photo.uri} style={styles.thumbWrap}>
              <Image source={{ uri: photo.thumbnailUri }} style={styles.thumbnail} contentFit="cover" />
              <Clickable
                style={[styles.removeButton, { backgroundColor: withAlpha(colors.text, 0.7) }]}
                onPress={() => onRemove(photo.uri)}
                accessibilityLabel="Remove photo"
                accessibilityRole="button"
              >
                <Ionicons name="close" size={12} color={colors.onPrimary} />
              </Clickable>
            </View>
          ))}

          {video ? (
            <View key={video.uri} style={styles.thumbWrap}>
              <Image source={{ uri: video.thumbnailUri }} style={styles.thumbnail} contentFit="cover" />
              <View style={[styles.videoOverlay, { backgroundColor: withAlpha(colors.text, 0.4) }]}>
                <Ionicons name="play" size={18} color={colors.onPrimary} />
              </View>
              <Clickable
                style={[styles.removeButton, { backgroundColor: withAlpha(colors.text, 0.7) }]}
                onPress={() => onRemove(video.uri)}
                accessibilityLabel="Remove video"
                accessibilityRole="button"
              >
                <Ionicons name="close" size={12} color={colors.onPrimary} />
              </Clickable>
            </View>
          ) : null}
        </Row>
      </ScrollView>
    </Column>
  );
};

const styles = StyleSheet.create({
  label: {
    ...Typography.caption,
  },
  thumbWrap: {
    width: 72,
    height: 72,
    borderRadius: Radii.md,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: Radii.md,
  },
  removeButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 44,
    height: 44,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoOverlay: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
