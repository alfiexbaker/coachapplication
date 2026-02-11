import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Chip } from '@/components/primitives/chip';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { SessionVideo } from '@/constants/types';
import { videoService } from '@/services/video-service';

interface VideoInfoSectionProps {
  video: SessionVideo;
  colors: ThemeColors;
}

export const VideoInfoSection = memo(function VideoInfoSection({ video, colors }: VideoInfoSectionProps) {
  const visibilityColor =
    video.visibility === 'PRIVATE' ? colors.muted
    : video.visibility === 'SHARED' ? colors.tint
    : colors.success;

  return (
    <View style={styles.container}>
      <ThemedText type="title">{video.title}</ThemedText>

      <Row gap="md" wrap>
        <Row gap={4} align="center">
          <Ionicons name="person-outline" size={16} color={colors.muted} />
          <ThemedText style={[styles.metaText, { color: colors.muted }]}>
            {video.athleteIds.join(', ')}
          </ThemedText>
        </Row>
        <Row gap={4} align="center">
          <Ionicons name="time-outline" size={16} color={colors.muted} />
          <ThemedText style={[styles.metaText, { color: colors.muted }]}>
            {videoService.formatDuration(video.duration)}
          </ThemedText>
        </Row>
        <Row gap={4} align="center">
          <Ionicons name="eye-outline" size={16} color={colors.muted} />
          <ThemedText style={[styles.metaText, { color: colors.muted }]}>
            {video.viewCount} views
          </ThemedText>
        </Row>
      </Row>

      <Row gap="xs" wrap align="center">
        {video.tags.map((tag) => (
          <Chip key={tag} dense selected={false}>{tag}</Chip>
        ))}
        <Row align="center" gap="xxs" style={[styles.visibilityBadge, { backgroundColor: withAlpha(visibilityColor, 0.09) }]}>
          <Ionicons
            name={video.visibility === 'PRIVATE' ? 'lock-closed' : video.visibility === 'SHARED' ? 'people' : 'globe'}
            size={12}
            color={visibilityColor}
          />
          <ThemedText style={[styles.visibilityText, { color: visibilityColor }]}>
            {video.visibility}
          </ThemedText>
        </Row>
      </Row>

      {video.description && (
        <ThemedText style={[styles.description, { color: colors.text }]}>
          {video.description}
        </ThemedText>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  metaText: {
    ...Typography.small,
  },
  visibilityBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
  visibilityText: {
    ...Typography.caption,
    textTransform: 'uppercase',
  },
  description: {
    ...Typography.bodySmall,
    marginTop: Spacing.xs,
  },
});
