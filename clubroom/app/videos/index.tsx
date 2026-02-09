import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { createLogger } from '@/utils/logger';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { Spacing, Radii, Typography , withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import { videoService } from '@/services/video-service';
import type { SessionVideo } from '@/constants/types';

const logger = createLogger('VideosScreen');

function VideoCard({
  video,
  index,
  onPress }: {
  video: SessionVideo;
  index: number;
  onPress: () => void;
}) {
  const { colors: palette } = useTheme();

  const visibilityIcon =
    video.visibility === 'PRIVATE'
      ? 'lock-closed'
      : video.visibility === 'SHARED'
      ? 'people'
      : 'globe';

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <SurfaceCard style={styles.videoCard} onPress={onPress}>
        <View style={styles.thumbnailContainer}>
          <Image
            source={{ uri: video.thumbnailUrl }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
          <View style={styles.durationBadge}>
            <ThemedText style={[styles.durationText, { color: palette.onPrimary }]}>
              {videoService.formatDuration(video.duration)}
            </ThemedText>
          </View>
          <View style={[styles.playButton, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
            <Ionicons name="play" size={24} color={palette.onPrimary} />
          </View>
        </View>

        <View style={styles.videoInfo}>
          <View style={styles.titleRow}>
            <ThemedText type="defaultSemiBold" style={styles.title} numberOfLines={2}>
              {video.title}
            </ThemedText>
            <Ionicons name={visibilityIcon} size={16} color={palette.muted} />
          </View>

          <ThemedText style={[styles.athletes, { color: palette.muted }]} numberOfLines={1}>
            {video.athleteNames.join(', ')}
          </ThemedText>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="eye-outline" size={14} color={palette.muted} />
              <ThemedText style={[styles.metaText, { color: palette.muted }]}>
                {video.viewCount} views
              </ThemedText>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="bookmark-outline" size={14} color={palette.muted} />
              <ThemedText style={[styles.metaText, { color: palette.muted }]}>
                {video.annotations.length} notes
              </ThemedText>
            </View>
            <ThemedText style={[styles.metaText, { color: palette.muted }]}>
              {new Date(video.createdAt).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short' })}
            </ThemedText>
          </View>

          {video.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {video.tags.slice(0, 3).map((tag) => (
                <View
                  key={tag}
                  style={[styles.tag, { backgroundColor: withAlpha(palette.tint, 0.06) }]}
                >
                  <ThemedText style={[styles.tagText, { color: palette.tint }]}>
                    {tag}
                  </ThemedText>
                </View>
              ))}
            </View>
          )}
        </View>
      </SurfaceCard>
    </Animated.View>
  );
}

export default function VideosScreen() {
  const { colors: palette } = useTheme();
  const { currentUser } = useAuth();

  const [videos, setVideos] = useState<SessionVideo[]>([]);
  const [, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalVideos: 0,
    totalViews: 0,
    sharedCount: 0 });

  const isCoach = currentUser?.role === 'COACH';

  const loadVideos = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const data = await videoService.getCoachVideos(currentUser.id);
      setVideos(data);

      const videoStats = await videoService.getCoachVideoStats(currentUser.id);
      setStats(videoStats);
    } catch (error) {
      logger.error('Failed to load videos:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Clickable>
        <View style={styles.headerTitle}>
          <ThemedText type="title">Session Videos</ThemedText>
        </View>
        {isCoach && (
          <Clickable
            onPress={() => router.push(Routes.VIDEOS_UPLOAD)}
            style={[styles.uploadButton, { backgroundColor: palette.tint }]}
          >
            <Ionicons name="cloud-upload-outline" size={20} color={palette.onPrimary} />
          </Clickable>
        )}
      </View>

      {/* Stats Summary */}
      {isCoach && videos.length > 0 && (
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: palette.surface }]}>
            <ThemedText type="heading" style={styles.statValue}>
              {stats.totalVideos}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
              Videos
            </ThemedText>
          </View>
          <View style={[styles.statCard, { backgroundColor: palette.surface }]}>
            <ThemedText type="heading" style={styles.statValue}>
              {stats.totalViews}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
              Views
            </ThemedText>
          </View>
          <View style={[styles.statCard, { backgroundColor: palette.surface }]}>
            <ThemedText type="heading" style={styles.statValue}>
              {stats.sharedCount}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
              Shared
            </ThemedText>
          </View>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {videos.length === 0 ? (
          <EmptyState
            icon="videocam-outline"
            title="No videos yet"
            message={
              isCoach
                ? 'Upload session videos to share progress with parents'
                : 'Videos shared by your coach will appear here'
            }
          />
        ) : (
          <View style={styles.list}>
            {videos.map((video, index) => (
              <VideoCard
                key={video.id}
                video={video}
                index={index}
                onPress={() =>
                  router.push(Routes.video(video.id))
                }
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md },
  headerTitle: {
    flex: 1 },
  uploadButton: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center' },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md },
  statValue: {
    ...Typography.title },
  statLabel: {
    ...Typography.caption },
  content: {
    padding: Spacing.lg,
    paddingTop: 0 },
  list: {
    gap: Spacing.md },
  videoCard: {
    padding: 0,
    overflow: 'hidden' },
  thumbnailContainer: {
    position: 'relative',
    height: 180 },
  thumbnail: {
    width: '100%',
    height: '100%' },
  durationBadge: {
    position: 'absolute',
    bottom: Spacing.xs,
    right: Spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.xs },
  durationText: {
    ...Typography.caption },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -24,
    marginTop: -24,
    width: 48,
    height: 48,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center' },
  videoInfo: {
    padding: Spacing.md,
    gap: Spacing.xxs },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm },
  title: {
    flex: 1,
    ...Typography.body },
  athletes: {
    ...Typography.small },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs },
  metaText: {
    ...Typography.caption },
  tagsRow: {
    flexDirection: 'row',
    gap: Spacing.xxs,
    marginTop: Spacing.xxs },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm },
  tagText: {
    ...Typography.caption } });