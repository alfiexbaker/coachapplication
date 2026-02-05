/**
 * Athlete Video Review Screen
 *
 * Allows athletes (and parents) to review annotated session videos.
 * Features:
 * - Video playback with coach annotations
 * - Timeline with annotation markers
 * - Jump between annotations
 * - Filter by annotation type
 * - Read-only annotation viewing
 */

import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

import { createLogger } from '@/utils/logger';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { VideoPlayer } from '@/components/video/video-player';
import { TimelineBar } from '@/components/video/TimelineBar';
import { AnnotationPanel } from '@/components/video/AnnotationPanel';
import { AnnotationBadge, AnnotationTypesSummary } from '@/components/video/AnnotationBadge';
import { EmptyState } from '@/components/ui/empty-state';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { videoService, ANNOTATION_TYPE_CONFIG } from '@/services/video-service';
import type { SessionVideo, VideoAnnotation, VideoAnnotationType } from '@/constants/types';

const logger = createLogger('AthleteReviewScreen');

export default function AthleteReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  // State
  const [video, setVideo] = useState<SessionVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeAnnotation, setActiveAnnotation] = useState<VideoAnnotation | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<VideoAnnotationType[]>([]);
  const [showAnnotationDetails, setShowAnnotationDetails] = useState(false);
  const [annotationStats, setAnnotationStats] = useState({
    total: 0,
    byType: { HIGHLIGHT: 0, IMPROVEMENT: 0, TECHNIQUE: 0, GENERAL: 0 },
    averagePerMinute: 0,
  });

  // Check if user has access
  const hasAccess = video && (
    video.athleteIds.includes(currentUser?.id ?? '') ||
    video.sharedWith.includes(currentUser?.id ?? '') ||
    video.visibility === 'PUBLIC'
  );

  // Load video data
  const loadVideo = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await videoService.getVideo(id);
      setVideo(data);

      if (data) {
        const stats = await videoService.getAnnotationStats(id);
        setAnnotationStats(stats);
      }
    } catch (error) {
      logger.error('Failed to load video:', error);
      Alert.alert('Error', 'Failed to load video. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadVideo();
  }, [loadVideo]);

  // Update active annotation based on current time
  useEffect(() => {
    if (!video) return;

    const nearby = video.annotations.find(
      (ann) => Math.abs(currentTime - ann.timestamp) < 2
    );

    if (nearby && nearby.id !== activeAnnotation?.id) {
      setActiveAnnotation(nearby);
      setShowAnnotationDetails(true);
    } else if (!nearby && showAnnotationDetails) {
      // Keep showing for a bit after passing
      const timer = setTimeout(() => {
        if (!video.annotations.find((ann) => Math.abs(currentTime - ann.timestamp) < 2)) {
          setShowAnnotationDetails(false);
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [currentTime, video, activeAnnotation, showAnnotationDetails]);

  // Handlers
  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);
  };

  const handleSeek = (time: number) => {
    setCurrentTime(time);
  };

  const handleAnnotationSelect = (annotation: VideoAnnotation) => {
    setCurrentTime(annotation.timestamp);
    setActiveAnnotation(annotation);
    setShowAnnotationDetails(true);
  };

  const handleNextAnnotation = async () => {
    if (!video) return;
    const next = await videoService.getNextAnnotation(video.id, currentTime);
    if (next) {
      handleAnnotationSelect(next);
    }
  };

  const handlePreviousAnnotation = async () => {
    if (!video) return;
    const prev = await videoService.getPreviousAnnotation(video.id, currentTime);
    if (prev) {
      handleAnnotationSelect(prev);
    }
  };

  const handleToggleType = (type: VideoAnnotationType) => {
    setSelectedTypes((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type]
    );
  };

  const filteredAnnotations = video?.annotations.filter(
    (ann) => selectedTypes.length === 0 || selectedTypes.includes(ann.type)
  ) ?? [];

  // Loading state
  if (loading || !video) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.header}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="defaultSemiBold">Loading...</ThemedText>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ThemedText style={{ color: palette.muted }}>Loading video...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  // Access denied
  if (!hasAccess) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.header}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="defaultSemiBold">Access Denied</ThemedText>
          <View style={{ width: 24 }} />
        </View>
        <EmptyState
          icon="lock-closed-outline"
          title="Video Not Available"
          message="This video hasn't been shared with you yet."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Clickable>
        <View style={styles.headerCenter}>
          <ThemedText type="defaultSemiBold" numberOfLines={1}>
            {video.title}
          </ThemedText>
          <ThemedText style={[styles.headerSubtitle, { color: palette.muted }]}>
            by {video.coachName}
          </ThemedText>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Video Player */}
        <Animated.View entering={FadeInDown.springify()}>
          <VideoPlayer
            videoUrl={video.videoUrl}
            thumbnailUrl={video.thumbnailUrl}
            duration={video.duration}
            annotations={filteredAnnotations}
            onAnnotationPress={handleAnnotationSelect}
            onTimeUpdate={handleTimeUpdate}
            initialPosition={currentTime}
          />
        </Animated.View>

        {/* Timeline with markers */}
        <Animated.View entering={FadeInDown.delay(50).springify()}>
          <TimelineBar
            duration={video.duration}
            currentTime={currentTime}
            annotations={filteredAnnotations}
            onSeek={handleSeek}
            onAnnotationPress={handleAnnotationSelect}
            showLabels
          />
        </Animated.View>

        {/* Navigation controls */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <View style={[styles.navigationBar, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Clickable
              onPress={handlePreviousAnnotation}
              style={[styles.navButton, { borderColor: palette.border }]}
            >
              <Ionicons name="play-skip-back" size={18} color={palette.text} />
              <ThemedText style={styles.navButtonText}>Previous</ThemedText>
            </Clickable>

            <View style={styles.navCenter}>
              <ThemedText style={[styles.annotationCount, { color: palette.muted }]}>
                {filteredAnnotations.length} annotations
              </ThemedText>
            </View>

            <Clickable
              onPress={handleNextAnnotation}
              style={[styles.navButton, { borderColor: palette.border }]}
            >
              <ThemedText style={styles.navButtonText}>Next</ThemedText>
              <Ionicons name="play-skip-forward" size={18} color={palette.text} />
            </Clickable>
          </View>
        </Animated.View>

        {/* Active Annotation Display */}
        {showAnnotationDetails && activeAnnotation && (
          <Animated.View entering={FadeIn.springify()}>
            <SurfaceCard
              style={[
                styles.activeAnnotationCard,
                { borderColor: ANNOTATION_TYPE_CONFIG[activeAnnotation.type].color },
              ]}
            >
              <View style={styles.activeAnnotationHeader}>
                <AnnotationBadge type={activeAnnotation.type} variant="filled" size="medium" />
                <ThemedText style={[styles.activeTimestamp, { color: palette.muted }]}>
                  {videoService.formatTimestamp(activeAnnotation.timestamp)}
                </ThemedText>
              </View>

              <ThemedText type="defaultSemiBold" style={styles.activeLabel}>
                {activeAnnotation.label}
              </ThemedText>

              {activeAnnotation.note && (
                <ThemedText style={[styles.activeNote, { color: palette.muted }]}>
                  {activeAnnotation.note}
                </ThemedText>
              )}

              {activeAnnotation.createdByName && (
                <View style={styles.activeFooter}>
                  <Ionicons name="person-outline" size={12} color={palette.muted} />
                  <ThemedText style={[styles.activeCreator, { color: palette.muted }]}>
                    {activeAnnotation.createdByName}
                  </ThemedText>
                </View>
              )}
            </SurfaceCard>
          </Animated.View>
        )}

        {/* Type Filter */}
        <Animated.View entering={FadeInDown.delay(150).springify()}>
          <SurfaceCard style={styles.filterCard}>
            <ThemedText type="defaultSemiBold" style={styles.filterTitle}>
              Filter by Type
            </ThemedText>
            <AnnotationTypesSummary
              counts={annotationStats.byType}
              selectedTypes={selectedTypes}
              onTypePress={handleToggleType}
            />
          </SurfaceCard>
        </Animated.View>

        {/* Annotations List */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <SurfaceCard style={styles.listCard}>
            {filteredAnnotations.length === 0 ? (
              <View style={styles.emptyList}>
                <Ionicons name="bookmark-outline" size={40} color={palette.muted} />
                <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
                  {video.annotations.length === 0
                    ? 'No annotations on this video yet'
                    : 'No annotations match your filter'}
                </ThemedText>
              </View>
            ) : (
              <AnnotationPanel
                annotations={filteredAnnotations}
                currentTime={currentTime}
                onAnnotationSelect={handleAnnotationSelect}
                isEditable={false}
                title={`Coach Notes (${filteredAnnotations.length})`}
              />
            )}
          </SurfaceCard>
        </Animated.View>

        {/* Video Info */}
        <Animated.View entering={FadeInDown.delay(250).springify()}>
          <SurfaceCard style={styles.infoCard}>
            <ThemedText type="defaultSemiBold">Video Details</ThemedText>

            <View style={styles.infoRow}>
              <ThemedText style={{ color: palette.muted }}>Coach</ThemedText>
              <ThemedText>{video.coachName}</ThemedText>
            </View>

            <View style={styles.infoRow}>
              <ThemedText style={{ color: palette.muted }}>Duration</ThemedText>
              <ThemedText>{videoService.formatDuration(video.duration)}</ThemedText>
            </View>

            <View style={styles.infoRow}>
              <ThemedText style={{ color: palette.muted }}>Uploaded</ThemedText>
              <ThemedText>
                {new Date(video.createdAt).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </ThemedText>
            </View>

            {video.description && (
              <View style={styles.descriptionSection}>
                <ThemedText style={{ color: palette.muted }}>Description</ThemedText>
                <ThemedText style={styles.descriptionText}>
                  {video.description}
                </ThemedText>
              </View>
            )}

            {video.tags.length > 0 && (
              <View style={styles.tagsSection}>
                <ThemedText style={{ color: palette.muted }}>Tags</ThemedText>
                <View style={styles.tagsRow}>
                  {video.tags.map((tag) => (
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
              </View>
            )}
          </SurfaceCard>
        </Animated.View>

        <View style={styles.bottomSpacer} />
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
  headerCenter: {
    flex: 1,
  },
  headerSubtitle: {
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: Spacing.lg,
    paddingTop: 0,
    gap: Spacing.md,
  },
  navigationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.sm,
    borderRadius: Radii.lg,
    borderWidth: 1,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  navButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  navCenter: {
    alignItems: 'center',
  },
  annotationCount: {
    fontSize: 12,
  },
  activeAnnotationCard: {
    padding: Spacing.md,
    borderWidth: 2,
    gap: Spacing.sm,
  },
  activeAnnotationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activeTimestamp: {
    fontSize: 13,
    fontWeight: '600',
  },
  activeLabel: {
    fontSize: 16,
  },
  activeNote: {
    fontSize: 14,
    lineHeight: 20,
  },
  activeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.xs,
  },
  activeCreator: {
    fontSize: 11,
  },
  filterCard: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  filterTitle: {
    fontSize: 14,
  },
  listCard: {
    padding: 0,
    minHeight: 200,
    overflow: 'hidden',
  },
  emptyList: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  infoCard: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  descriptionSection: {
    gap: Spacing.xs,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  tagsSection: {
    gap: Spacing.xs,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  tag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  bottomSpacer: {
    height: 40,
  },
});
