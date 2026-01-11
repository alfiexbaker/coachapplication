import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Image, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { videoService, type LocalVideo } from '@/services/video-service';
import { clubFeedService } from '@/services/social-feed-service';
import type { SessionVideo } from '@/constants/types';

// Extended type to handle both mock and local videos
type ExtendedVideo = SessionVideo & { isLocal?: boolean };

function VideoCard({
  video,
  index,
  onPress,
  onDelete,
  onShare,
  isCoach,
}: {
  video: ExtendedVideo;
  index: number;
  onPress: () => void;
  onDelete?: (id: string) => void;
  onShare?: (video: ExtendedVideo) => void;
  isCoach?: boolean;
}) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const visibilityIcon =
    video.visibility === 'PRIVATE'
      ? 'lock-closed'
      : video.visibility === 'SHARED'
      ? 'people'
      : 'globe';

  const handleDelete = () => {
    Alert.alert(
      'Delete Video',
      `Are you sure you want to delete "${video.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete?.(video.id),
        },
      ]
    );
  };

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
            <ThemedText style={styles.durationText}>
              {videoService.formatDuration(video.duration)}
            </ThemedText>
          </View>
          <View style={[styles.playButton, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
            <Ionicons name="play" size={24} color="#fff" />
          </View>
          {video.isLocal && (
            <View style={[styles.localBadge, { backgroundColor: palette.success }]}>
              <Ionicons name="phone-portrait" size={10} color="#fff" />
            </View>
          )}
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
            {!video.isLocal && (
              <>
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
              </>
            )}
            <ThemedText style={[styles.metaText, { color: palette.muted }]}>
              {new Date(video.createdAt).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
              })}
            </ThemedText>
          </View>

          {video.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {video.tags.slice(0, 3).map((tag) => (
                <View
                  key={tag}
                  style={[styles.tag, { backgroundColor: `${palette.tint}10` }]}
                >
                  <ThemedText style={[styles.tagText, { color: palette.tint }]}>
                    {tag}
                  </ThemedText>
                </View>
              ))}
            </View>
          )}

          {/* Actions for local videos */}
          {isCoach && video.isLocal && (
            <View style={styles.actionsRow}>
              {video.visibility === 'PRIVATE' && (
                <Clickable
                  onPress={() => onShare?.(video)}
                  style={[styles.actionBtn, { backgroundColor: `${palette.tint}15` }]}
                >
                  <Ionicons name="share-outline" size={14} color={palette.tint} />
                  <ThemedText style={[styles.actionBtnText, { color: palette.tint }]}>
                    Share
                  </ThemedText>
                </Clickable>
              )}
              <Clickable
                onPress={handleDelete}
                style={[styles.actionBtn, { backgroundColor: `${palette.error}15` }]}
              >
                <Ionicons name="trash-outline" size={14} color={palette.error} />
                <ThemedText style={[styles.actionBtnText, { color: palette.error }]}>
                  Delete
                </ThemedText>
              </Clickable>
            </View>
          )}
        </View>
      </SurfaceCard>
    </Animated.View>
  );
}

export default function VideosScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [videos, setVideos] = useState<ExtendedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalVideos: 0,
    totalViews: 0,
    sharedCount: 0,
  });

  const isCoach = currentUser?.role === 'COACH';
  const isParent = currentUser?.role === 'PARENT';

  useEffect(() => {
    loadVideos();
  }, [currentUser?.id]);

  const loadVideos = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      // Get combined videos (mock + local)
      const allVideos = await videoService.getAllVideosForCoach(currentUser.id);
      setVideos(allVideos as ExtendedVideo[]);

      // Calculate stats from both sources
      const localVideos = await videoService.getVideos(currentUser.id);
      const mockStats = await videoService.getCoachVideoStats(currentUser.id);

      setStats({
        totalVideos: mockStats.totalVideos + localVideos.length,
        totalViews: mockStats.totalViews,
        sharedCount: mockStats.sharedCount + localVideos.filter(v => v.visibility === 'SHARED').length,
      });
    } catch (error) {
      console.error('Failed to load videos:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadVideos();
    setRefreshing(false);
  }, [loadVideos]);

  const handleUploadVideo = async () => {
    if (!currentUser) return;

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to your videos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsMultipleSelection: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];

        // Prompt for video title
        Alert.prompt(
          'Video Title',
          'Enter a title for this video',
          async (title) => {
            if (!title) return;

            // Ask if they want to share to feed
            Alert.alert(
              'Share to Club Feed?',
              'Would you like to share this video with the club?',
              [
                {
                  text: 'Keep Private',
                  style: 'cancel',
                  onPress: () => saveVideo(asset, title, false),
                },
                {
                  text: 'Share to Feed',
                  onPress: () => saveVideo(asset, title, true),
                },
              ]
            );
          },
          'plain-text',
          'Training Video'
        );
      }
    } catch (error) {
      console.error('Failed to pick video:', error);
      Alert.alert('Error', 'Failed to pick video');
    }
  };

  const saveVideo = async (
    asset: ImagePicker.ImagePickerAsset,
    title: string,
    shareToFeed: boolean
  ) => {
    if (!currentUser) return;

    try {
      const savedVideo = await videoService.saveLocalVideo(asset.uri, {
        title,
        coachId: currentUser.id,
        coachName: currentUser.name || 'Coach',
        athleteIds: [],
        athleteNames: [],
        duration: asset.duration ? asset.duration / 1000 : undefined,
        fileSize: asset.fileSize,
        shareToFeed,
      });

      // If sharing to feed, create a video post
      if (shareToFeed) {
        clubFeedService.createVideoPost({
          clubId: 'club_bradwell', // Default club for now
          videoId: savedVideo.id,
          videoTitle: title,
          videoUri: asset.uri,
          duration: savedVideo.duration,
          coachId: currentUser.id,
          coachName: currentUser.name || 'Coach',
        });

        await videoService.markSharedToFeed(savedVideo.id);
      }

      Alert.alert('Success', 'Video saved successfully!');
      loadVideos();
    } catch (error) {
      console.error('Failed to save video:', error);
      Alert.alert('Error', 'Failed to save video. Please try again.');
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    const success = await videoService.deleteLocalVideo(videoId);
    if (success) {
      loadVideos();
    }
  };

  const handleShareVideo = async (video: ExtendedVideo) => {
    Alert.alert(
      'Share Video',
      'Share this video with parents and to the club feed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Share with Parents',
          onPress: async () => {
            await videoService.shareLocalVideo(video.id, ['parent_1']); // Share with default parent
            Alert.alert('Shared', 'Video is now visible to parents');
            loadVideos();
          },
        },
        {
          text: 'Share to Club Feed',
          onPress: async () => {
            if (!currentUser) return;

            clubFeedService.createVideoPost({
              clubId: 'club_bradwell',
              videoId: video.id,
              videoTitle: video.title,
              videoUri: video.videoUrl,
              thumbnailUri: video.thumbnailUrl,
              duration: video.duration,
              athleteId: video.athleteIds[0],
              athleteName: video.athleteNames[0],
              coachId: currentUser.id,
              coachName: currentUser.name || 'Coach',
            });

            await videoService.shareLocalVideo(video.id, ['parent_1']);
            await videoService.markSharedToFeed(video.id);
            Alert.alert('Shared', 'Video posted to club feed');
            loadVideos();
          },
        },
      ]
    );
  };

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
            onPress={handleUploadVideo}
            style={[styles.uploadButton, { backgroundColor: palette.tint }]}
          >
            <Ionicons name="add" size={20} color="#fff" />
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {videos.length === 0 ? (
          <EmptyState
            icon="videocam-outline"
            title="No videos yet"
            message={
              isCoach
                ? 'Tap + to upload session videos and share with parents'
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
                isCoach={isCoach}
                onDelete={handleDeleteVideo}
                onShare={handleShareVideo}
                onPress={() => {
                  // For local videos, we might want to show a simple player
                  // For mock videos, navigate to detail page
                  if (video.isLocal) {
                    Alert.alert(
                      video.title,
                      `Duration: ${videoService.formatDuration(video.duration)}\nCreated: ${new Date(video.createdAt).toLocaleDateString()}`,
                      [{ text: 'OK' }]
                    );
                  } else {
                    router.push({
                      pathname: '/videos/[id]',
                      params: { id: video.id },
                    });
                  }
                }}
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
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  headerTitle: {
    flex: 1,
  },
  uploadButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  statValue: {
    fontSize: 20,
  },
  statLabel: {
    fontSize: 12,
  },
  content: {
    padding: Spacing.lg,
    paddingTop: 0,
  },
  list: {
    gap: Spacing.md,
  },
  videoCard: {
    padding: 0,
    overflow: 'hidden',
  },
  thumbnailContainer: {
    position: 'relative',
    height: 180,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  durationBadge: {
    position: 'absolute',
    bottom: Spacing.xs,
    right: Spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -24,
    marginTop: -24,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoInfo: {
    padding: Spacing.md,
    gap: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: 15,
  },
  athletes: {
    fontSize: 13,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  localBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
    paddingTop: Spacing.xs,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
