import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { VideoPlayer } from '@/components/video/video-player';
import { TimelineBar } from '@/components/video/TimelineBar';
import { AnnotationPanel } from '@/components/video/AnnotationPanel';
import { AnnotationBadge, AnnotationTypesSummary } from '@/components/video/AnnotationBadge';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState, ErrorState } from '@/components/ui/screen-states';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { useVideoReview } from '@/hooks/use-video-review';
import { videoService, ANNOTATION_TYPE_CONFIG } from '@/services/video-service';
import { ok } from '@/types/result';

export default function AthleteReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: palette } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  const {
    video,
    loading,
    status,
    error,
    retry,
    currentTime,
    activeAnnotation,
    selectedTypes,
    showAnnotationDetails,
    annotationStats,
    hasAccess,
    filteredAnnotations,
    handleTimeUpdate,
    handleSeek,
    handleAnnotationSelect,
    handleNextAnnotation,
    handlePreviousAnnotation,
    handleToggleType,
  } = useVideoReview(id);

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top']}
      >
        <Row align="center" gap="md" style={styles.header}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="defaultSemiBold">Video Review</ThemedText>
          <View style={{ width: 24 }} />
        </Row>
        <LoadingState variant="detail" />
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top']}
      >
        <ErrorState message={error?.message ?? 'Failed to load review video.'} onRetry={retry} />
      </SafeAreaView>
    );
  }

  if (status === 'empty' || !video) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top']}
      >
        <EmptyState
          icon="videocam-outline"
          title="Video not found"
          message="This review video is unavailable."
        />
      </SafeAreaView>
    );
  }

  if (!hasAccess) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top']}
      >
        <Row align="center" gap="md" style={styles.header}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="defaultSemiBold">Access Denied</ThemedText>
          <View style={{ width: 24 }} />
        </Row>
        <EmptyState
          icon="lock-closed-outline"
          title="Video Not Available"
          message="This video hasn't been shared with you yet."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top']}
    >
      <Row align="center" gap="md" style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Clickable>
        <View style={styles.headerCenter}>
          <ThemedText type="defaultSemiBold" numberOfLines={1}>
            {video.title}
          </ThemedText>
          <ThemedText style={[styles.headerSubtitle, { color: palette.muted }]}>
            by {video.coachId}
          </ThemedText>
        </View>
        <View style={{ width: 24 }} />
      </Row>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
        <Row
          align="center"
          justify="space-between"
          style={[
            styles.navigationBar,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          <Clickable
            onPress={handlePreviousAnnotation}
            style={[styles.navButton, { borderColor: palette.border }]}
          >
            <Row align="center" gap="xs">
              <Ionicons name="play-skip-back" size={18} color={palette.text} />
              <ThemedText style={styles.navButtonText}>Previous</ThemedText>
            </Row>
          </Clickable>
          <ThemedText style={[styles.annotationCount, { color: palette.muted }]}>
            {filteredAnnotations.length} annotations
          </ThemedText>
          <Clickable
            onPress={handleNextAnnotation}
            style={[styles.navButton, { borderColor: palette.border }]}
          >
            <Row align="center" gap="xs">
              <ThemedText style={styles.navButtonText}>Next</ThemedText>
              <Ionicons name="play-skip-forward" size={18} color={palette.text} />
            </Row>
          </Clickable>
        </Row>

        {/* Active Annotation */}
        {showAnnotationDetails && activeAnnotation && (
          <Animated.View entering={FadeIn.springify()}>
            <SurfaceCard
              style={[
                styles.activeCard,
                { borderColor: ANNOTATION_TYPE_CONFIG[activeAnnotation.type].color },
              ]}
            >
              <Row align="center" justify="space-between">
                <AnnotationBadge type={activeAnnotation.type} variant="filled" size="medium" />
                <ThemedText style={[styles.activeTimestamp, { color: palette.muted }]}>
                  {videoService.formatTimestamp(activeAnnotation.timestamp)}
                </ThemedText>
              </Row>
              <ThemedText type="defaultSemiBold">{activeAnnotation.label}</ThemedText>
              {activeAnnotation.note && (
                <ThemedText style={{ color: palette.muted, ...Typography.bodySmall }}>
                  {activeAnnotation.note}
                </ThemedText>
              )}
              {activeAnnotation.createdBy && (
                <Row align="center" gap="xxs" style={styles.activeFooter}>
                  <Ionicons name="person-outline" size={12} color={palette.muted} />
                  <ThemedText style={[styles.activeCreator, { color: palette.muted }]}>
                    {activeAnnotation.createdBy}
                  </ThemedText>
                </Row>
              )}
            </SurfaceCard>
          </Animated.View>
        )}

        {/* Type Filter */}
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

        {/* Annotations List */}
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

        {/* Video Info */}
        <SurfaceCard style={styles.infoCard}>
          <ThemedText type="defaultSemiBold">Video Details</ThemedText>
          <Row justify="space-between" align="center">
            <ThemedText style={{ color: palette.muted }}>Coach</ThemedText>
            <ThemedText>{video.coachId}</ThemedText>
          </Row>
          <Row justify="space-between" align="center">
            <ThemedText style={{ color: palette.muted }}>Duration</ThemedText>
            <ThemedText>{videoService.formatDuration(video.duration)}</ThemedText>
          </Row>
          <Row justify="space-between" align="center">
            <ThemedText style={{ color: palette.muted }}>Uploaded</ThemedText>
            <ThemedText>
              {new Date(video.createdAt).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </ThemedText>
          </Row>
          {video.description && (
            <View style={styles.descSection}>
              <ThemedText style={{ color: palette.muted }}>Description</ThemedText>
              <ThemedText style={styles.descText}>{video.description}</ThemedText>
            </View>
          )}
          {video.tags.length > 0 && (
            <View style={styles.tagsSection}>
              <ThemedText style={{ color: palette.muted }}>Tags</ThemedText>
              <Row gap="xs" wrap>
                {video.tags.map((tag) => (
                  <View
                    key={tag}
                    style={[styles.tag, { backgroundColor: withAlpha(palette.tint, 0.06) }]}
                  >
                    <ThemedText style={[styles.tagText, { color: palette.tint }]}>{tag}</ThemedText>
                  </View>
                ))}
              </Row>
            </View>
          )}
        </SurfaceCard>
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  headerCenter: { flex: 1 },
  headerSubtitle: { ...Typography.caption },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.lg, paddingTop: 0, gap: Spacing.md },
  navigationBar: { padding: Spacing.sm, borderRadius: Radii.lg, borderWidth: 1 },
  navButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  navButtonText: { ...Typography.smallSemiBold },
  annotationCount: { ...Typography.caption },
  activeCard: { padding: Spacing.md, borderWidth: 2, gap: Spacing.sm },
  activeHeader: {},
  activeTimestamp: { ...Typography.smallSemiBold },
  activeFooter: { marginTop: Spacing.xs },
  activeCreator: { ...Typography.caption },
  filterCard: { padding: Spacing.md, gap: Spacing.sm },
  filterTitle: { ...Typography.bodySmall },
  listCard: { padding: 0, minHeight: 200, overflow: 'hidden' },
  emptyList: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyText: { ...Typography.bodySmall, textAlign: 'center' },
  infoCard: { padding: Spacing.md, gap: Spacing.md },
  infoRow: {},
  descSection: { gap: Spacing.xs },
  descText: { ...Typography.bodySmall },
  tagsSection: { gap: Spacing.xs },
  tagsRow: {},
  tag: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xxs, borderRadius: Radii.sm },
  tagText: { ...Typography.caption },
  bottomSpacer: { height: 40 },
});
