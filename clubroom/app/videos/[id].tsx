import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { createLogger } from '@/utils/logger';
import { Clickable } from '@/components/primitives/clickable';
import { Chip } from '@/components/primitives/chip';
import { ThemedText } from '@/components/themed-text';
import { VideoPlayer, AnnotationTimeline } from '@/components/video/video-player';
import { AddAnnotationModal, QuickAnnotationBar } from '@/components/video/video-annotation';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { videoService } from '@/services/video-service';
import type { SessionVideo, VideoAnnotation, VideoAnnotationType } from '@/constants/types';

const logger = createLogger('VideoDetailScreen');

export default function VideoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [video, setVideo] = useState<SessionVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [showAnnotationModal, setShowAnnotationModal] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_pendingAnnotationType, setPendingAnnotationType] = useState<VideoAnnotationType | undefined>();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _isCoach = currentUser?.role === 'COACH';
  const isOwner = video?.coachId === currentUser?.id;

  const loadVideo = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await videoService.getVideo(id);
      setVideo(data);
    } catch (error) {
      logger.error('Failed to load video:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadVideo();
  }, [loadVideo]);

  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);
  };

  const handleSeekToAnnotation = (annotation: VideoAnnotation) => {
    setCurrentTime(annotation.timestamp);
  };

  const handleQuickAnnotation = (type: VideoAnnotationType) => {
    setPendingAnnotationType(type);
    setShowAnnotationModal(true);
  };

  const handleSaveAnnotation = async (annotation: Omit<VideoAnnotation, 'id'>) => {
    if (!video) return;
    try {
      await videoService.addAnnotation(video.id, annotation.timestamp, annotation.label, annotation.type, annotation.note);
      await loadVideo();
    } catch (error) {
      throw error;
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _handleDeleteAnnotation = async (annotationId: string) => {
    if (!video) return;
    Alert.alert('Delete Annotation', 'Are you sure you want to delete this annotation?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await videoService.removeAnnotation(video.id, annotationId);
            await loadVideo();
          } catch (error) {
            logger.error('Failed to delete annotation:', error);
          }
        },
      },
    ]);
  };

  const handleShare = async () => {
    if (!video) return;
    try {
      await Share.share({
        title: video.title,
        message: `Check out this training video: ${video.title}`,
        url: video.videoUrl,
      });
    } catch (error) {
      logger.error('Failed to share:', error);
    }
  };

  const handleToggleVisibility = async () => {
    if (!video) return;

    if (video.visibility === 'PRIVATE') {
      // Share with athletes' parents
      try {
        // In a real app, we'd show a picker for selecting parents
        await videoService.shareVideo(video.id, ['parent_1']);
        Alert.alert('Shared', 'Video has been shared with parents.');
        await loadVideo();
      } catch (error) {
        logger.error('Failed to share video:', error);
      }
    } else {
      try {
        await videoService.makePrivate(video.id);
        Alert.alert('Made Private', 'Video is now private.');
        await loadVideo();
      } catch (error) {
        logger.error('Failed to make private:', error);
      }
    }
  };

  const handleDelete = () => {
    if (!video) return;
    Alert.alert('Delete Video', 'Are you sure you want to delete this video? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await videoService.deleteVideo(video.id);
            router.back();
          } catch (error) {
            logger.error('Failed to delete video:', error);
          }
        },
      },
    ]);
  };

  if (loading || !video) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.header}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="title">Loading...</ThemedText>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Clickable>
        <View style={{ flex: 1 }} />
        <Clickable onPress={handleShare} hitSlop={8}>
          <Ionicons name="share-outline" size={22} color={palette.text} />
        </Clickable>
        {isOwner && (
          <Clickable onPress={handleDelete} hitSlop={8} style={{ marginLeft: Spacing.md }}>
            <Ionicons name="trash-outline" size={22} color={palette.error} />
          </Clickable>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Video Player */}
        <Animated.View entering={FadeInDown.springify()}>
          <VideoPlayer
            videoUrl={video.videoUrl}
            thumbnailUrl={video.thumbnailUrl}
            duration={video.duration}
            annotations={video.annotations}
            onAnnotationPress={handleSeekToAnnotation}
            onTimeUpdate={handleTimeUpdate}
          />
        </Animated.View>

        {/* Quick Annotation Bar (Coach Only) */}
        {isOwner && (
          <Animated.View entering={FadeInDown.delay(50).springify()}>
            <QuickAnnotationBar onAdd={handleQuickAnnotation} />
          </Animated.View>
        )}

        {/* Video Info */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <View style={styles.infoSection}>
            <ThemedText type="title" style={styles.videoTitle}>
              {video.title}
            </ThemedText>

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="person-outline" size={16} color={palette.muted} />
                <ThemedText style={[styles.metaText, { color: palette.muted }]}>
                  {video.athleteNames.join(', ')}
                </ThemedText>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={16} color={palette.muted} />
                <ThemedText style={[styles.metaText, { color: palette.muted }]}>
                  {videoService.formatDuration(video.duration)}
                </ThemedText>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="eye-outline" size={16} color={palette.muted} />
                <ThemedText style={[styles.metaText, { color: palette.muted }]}>
                  {video.viewCount} views
                </ThemedText>
              </View>
            </View>

            <View style={styles.tagsRow}>
              {video.tags.map((tag) => (
                <Chip key={tag} dense selected={false}>
                  {tag}
                </Chip>
              ))}
              <View
                style={[
                  styles.visibilityBadge,
                  {
                    backgroundColor:
                      video.visibility === 'PRIVATE'
                        ? `${palette.muted}15`
                        : video.visibility === 'SHARED'
                        ? `${palette.tint}15`
                        : `${palette.success}15`,
                  },
                ]}
              >
                <Ionicons
                  name={video.visibility === 'PRIVATE' ? 'lock-closed' : video.visibility === 'SHARED' ? 'people' : 'globe'}
                  size={12}
                  color={
                    video.visibility === 'PRIVATE'
                      ? palette.muted
                      : video.visibility === 'SHARED'
                      ? palette.tint
                      : palette.success
                  }
                />
                <ThemedText
                  style={[
                    styles.visibilityText,
                    {
                      color:
                        video.visibility === 'PRIVATE'
                          ? palette.muted
                          : video.visibility === 'SHARED'
                          ? palette.tint
                          : palette.success,
                    },
                  ]}
                >
                  {video.visibility}
                </ThemedText>
              </View>
            </View>

            {video.description && (
              <ThemedText style={[styles.description, { color: palette.text }]}>
                {video.description}
              </ThemedText>
            )}
          </View>
        </Animated.View>

        {/* Coach Actions */}
        {isOwner && (
          <Animated.View entering={FadeInDown.delay(150).springify()}>
            <SurfaceCard style={styles.actionsCard}>
              <ThemedText type="defaultSemiBold">Actions</ThemedText>
              <View style={styles.actionsRow}>
                <Clickable
                  onPress={() => setShowAnnotationModal(true)}
                  style={[styles.actionButton, { borderColor: palette.border }]}
                >
                  <Ionicons name="bookmark-outline" size={18} color={palette.tint} />
                  <ThemedText style={{ color: palette.tint, fontWeight: '600' }}>
                    Add Annotation
                  </ThemedText>
                </Clickable>
                <Clickable
                  onPress={handleToggleVisibility}
                  style={[styles.actionButton, { borderColor: palette.border }]}
                >
                  <Ionicons
                    name={video.visibility === 'PRIVATE' ? 'share-outline' : 'lock-closed-outline'}
                    size={18}
                    color={palette.text}
                  />
                  <ThemedText style={{ fontWeight: '600' }}>
                    {video.visibility === 'PRIVATE' ? 'Share' : 'Make Private'}
                  </ThemedText>
                </Clickable>
              </View>
            </SurfaceCard>
          </Animated.View>
        )}

        {/* Annotations Section */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <SurfaceCard style={styles.annotationsCard}>
            <AnnotationTimeline
              annotations={video.annotations}
              currentTime={currentTime}
              duration={video.duration}
              onSeek={(timestamp) => setCurrentTime(timestamp)}
            />
          </SurfaceCard>
        </Animated.View>

        {/* Video Details */}
        <Animated.View entering={FadeInDown.delay(250).springify()}>
          <SurfaceCard style={styles.detailsCard}>
            <ThemedText type="defaultSemiBold" style={styles.detailsTitle}>
              Details
            </ThemedText>
            <View style={styles.detailRow}>
              <ThemedText style={{ color: palette.muted }}>Coach</ThemedText>
              <ThemedText>{video.coachName}</ThemedText>
            </View>
            <View style={styles.detailRow}>
              <ThemedText style={{ color: palette.muted }}>Uploaded</ThemedText>
              <ThemedText>
                {new Date(video.createdAt).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </ThemedText>
            </View>
            <View style={styles.detailRow}>
              <ThemedText style={{ color: palette.muted }}>File Size</ThemedText>
              <ThemedText>{videoService.formatFileSize(video.fileSize)}</ThemedText>
            </View>
            {video.sessionId && (
              <View style={styles.detailRow}>
                <ThemedText style={{ color: palette.muted }}>Session</ThemedText>
                <Clickable>
                  <ThemedText style={{ color: palette.tint }}>View Session</ThemedText>
                </Clickable>
              </View>
            )}
          </SurfaceCard>
        </Animated.View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <AddAnnotationModal
        visible={showAnnotationModal}
        onClose={() => {
          setShowAnnotationModal(false);
          setPendingAnnotationType(undefined);
        }}
        onSave={handleSaveAnnotation}
        currentTime={currentTime}
        duration={video.duration}
      />
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
  content: {
    padding: Spacing.lg,
    paddingTop: 0,
    gap: Spacing.md,
  },
  infoSection: {
    gap: Spacing.sm,
  },
  videoTitle: {
    fontSize: 22,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  visibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  visibilityText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: Spacing.xs,
  },
  actionsCard: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  annotationsCard: {
    padding: Spacing.md,
  },
  detailsCard: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  detailsTitle: {
    marginBottom: Spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomSpacer: {
    height: 40,
  },
});
