import React, { memo } from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { Spacing, Typography } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';

export interface DevSessionMediaProps {
  videoUrls: string[];
  imageUrls: string[];
  onAddVideo: () => void;
  onRemoveVideo: (index: number) => void;
  onAddImage: () => void;
  onRemoveImage: (index: number) => void;
  colors: ThemeColors;
}

export const DevSessionMedia = memo(function DevSessionMedia({
  videoUrls,
  imageUrls,
  onAddVideo,
  onRemoveVideo,
  onAddImage,
  onRemoveImage,
  colors,
}: DevSessionMediaProps) {
  return (
    <Column gap="md">
      {/* Videos */}
      <Column gap="sm">
        <Row justify="space-between" align="center">
          <ThemedText type="subtitle" style={Typography.subheading}>
            Video Clips
          </ThemedText>
          <Clickable
            accessibilityLabel="Add video clip"
            onPress={onAddVideo}
            style={{ padding: Spacing.xs }}
          >
            <Ionicons name="add-circle" size={24} color={colors.tint} />
          </Clickable>
        </Row>
        {videoUrls.length > 0 ? (
          <Column gap="xs">
            {videoUrls.map((_, index) => (
              <SurfaceCard key={index} style={styles.mediaCard}>
                <Row gap="sm" align="center" style={{ flex: 1 }}>
                  <Ionicons name="videocam" size={20} color={colors.tint} />
                  <ThemedText style={Typography.bodySmall} numberOfLines={1}>
                    Video {index + 1}
                  </ThemedText>
                </Row>
                <Clickable accessibilityLabel="Remove video" onPress={() => onRemoveVideo(index)}>
                  <Ionicons name="trash-outline" size={20} color={colors.error} />
                </Clickable>
              </SurfaceCard>
            ))}
          </Column>
        ) : (
          <SurfaceCard style={styles.empty}>
            <Ionicons name="videocam-outline" size={32} color={colors.muted} />
            <ThemedText style={[Typography.small, { color: colors.muted, textAlign: 'center' }]}>
              Link training videos for parent review
            </ThemedText>
          </SurfaceCard>
        )}
      </Column>

      {/* Images */}
      <Column gap="sm">
        <Row justify="space-between" align="center">
          <ThemedText type="subtitle" style={Typography.subheading}>
            Session Photos
          </ThemedText>
          <Clickable
            accessibilityLabel="Add session photo"
            onPress={onAddImage}
            style={{ padding: Spacing.xs }}
          >
            <Ionicons name="add-circle" size={24} color={colors.tint} />
          </Clickable>
        </Row>
        {imageUrls.length > 0 ? (
          <Column gap="xs">
            {imageUrls.map((_, index) => (
              <SurfaceCard key={index} style={styles.mediaCard}>
                <Row gap="sm" align="center" style={{ flex: 1 }}>
                  <Ionicons name="image" size={20} color={colors.tint} />
                  <ThemedText style={Typography.bodySmall} numberOfLines={1}>
                    Photo {index + 1}
                  </ThemedText>
                </Row>
                <Clickable accessibilityLabel="Remove image" onPress={() => onRemoveImage(index)}>
                  <Ionicons name="trash-outline" size={20} color={colors.error} />
                </Clickable>
              </SurfaceCard>
            ))}
          </Column>
        ) : (
          <SurfaceCard style={styles.empty}>
            <Ionicons name="image-outline" size={32} color={colors.muted} />
            <ThemedText style={[Typography.small, { color: colors.muted, textAlign: 'center' }]}>
              No photos uploaded yet
            </ThemedText>
          </SurfaceCard>
        )}
      </Column>
    </Column>
  );
});

const styles = StyleSheet.create({
  mediaCard: { alignItems: 'center', justifyContent: 'space-between', padding: Spacing.sm },
  empty: { padding: Spacing.lg, alignItems: 'center', gap: Spacing.xs },
});
