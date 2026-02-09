import { memo } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import { videoService } from '@/services/video-service';
import type { SessionVideo } from '@/constants/types';

interface VideoCardProps {
  video: SessionVideo;
  index: number;
  onPress: () => void;
  colors: ThemeColors;
}

export const VideoCard = memo(function VideoCard({ video, index, onPress, colors }: VideoCardProps) {
  const visibilityIcon = video.visibility === 'PRIVATE' ? 'lock-closed' : video.visibility === 'SHARED' ? 'people' : 'globe';

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <SurfaceCard style={styles.card} onPress={onPress}>
        <View style={styles.thumbnailContainer}>
          <Image source={{ uri: video.thumbnailUrl }} style={styles.thumbnail} resizeMode="cover" />
          <View style={styles.durationBadge}>
            <ThemedText style={[styles.durationText, { color: colors.onPrimary }]}>
              {videoService.formatDuration(video.duration)}
            </ThemedText>
          </View>
          <View style={styles.playButton}>
            <Ionicons name="play" size={24} color={colors.onPrimary} />
          </View>
        </View>
        <View style={styles.info}>
          <View style={styles.titleRow}>
            <ThemedText type="defaultSemiBold" style={styles.title} numberOfLines={2}>{video.title}</ThemedText>
            <Ionicons name={visibilityIcon} size={16} color={colors.muted} />
          </View>
          <ThemedText style={[styles.athletes, { color: colors.muted }]} numberOfLines={1}>{video.athleteNames.join(', ')}</ThemedText>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="eye-outline" size={14} color={colors.muted} />
              <ThemedText style={[styles.metaText, { color: colors.muted }]}>{video.viewCount} views</ThemedText>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="bookmark-outline" size={14} color={colors.muted} />
              <ThemedText style={[styles.metaText, { color: colors.muted }]}>{video.annotations.length} notes</ThemedText>
            </View>
            <ThemedText style={[styles.metaText, { color: colors.muted }]}>
              {new Date(video.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </ThemedText>
          </View>
          {video.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {video.tags.slice(0, 3).map(tag => (
                <View key={tag} style={[styles.tag, { backgroundColor: withAlpha(colors.tint, 0.06) }]}>
                  <ThemedText style={[styles.tagText, { color: colors.tint }]}>{tag}</ThemedText>
                </View>
              ))}
            </View>
          )}
        </View>
      </SurfaceCard>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: { padding: 0, overflow: 'hidden' },
  thumbnailContainer: { position: 'relative', height: 180 },
  thumbnail: { width: '100%', height: '100%' },
  durationBadge: { position: 'absolute', bottom: Spacing.xs, right: Spacing.xs, backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: Spacing.xxs, paddingVertical: Spacing.micro, borderRadius: Radii.xs },
  durationText: { ...Typography.caption },
  playButton: { position: 'absolute', top: '50%', left: '50%', marginLeft: -24, marginTop: -24, width: 48, height: 48, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  info: { padding: Spacing.md, gap: Spacing.xxs },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  title: { flex: 1, ...Typography.body },
  athletes: { ...Typography.small },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs },
  metaText: { ...Typography.caption },
  tagsRow: { flexDirection: 'row', gap: Spacing.xxs, marginTop: Spacing.xxs },
  tag: { paddingHorizontal: 8, paddingVertical: Spacing.micro, borderRadius: Radii.sm },
  tagText: { ...Typography.caption },
});
