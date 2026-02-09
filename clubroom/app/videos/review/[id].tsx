import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { VideoPlayer } from '@/components/video/video-player';
import { TimelineBar } from '@/components/video/TimelineBar';
import { AnnotationPanel } from '@/components/video/AnnotationPanel';
import { AnnotationBadge, AnnotationTypesSummary } from '@/components/video/AnnotationBadge';
import { EmptyState } from '@/components/ui/empty-state';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useVideoReview } from '@/hooks/use-video-review';
import { videoService, ANNOTATION_TYPE_CONFIG } from '@/services/video-service';

export default function AthleteReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: palette } = useTheme();
  const {
    video, loading, currentTime, activeAnnotation, selectedTypes,
    showAnnotationDetails, annotationStats, hasAccess, filteredAnnotations,
    handleTimeUpdate, handleSeek, handleAnnotationSelect,
    handleNextAnnotation, handlePreviousAnnotation, handleToggleType,
  } = useVideoReview(id);

  if (loading || !video) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.header}>
          <Clickable onPress={() => router.back()} hitSlop={8}><Ionicons name="arrow-back" size={24} color={palette.text} /></Clickable>
          <ThemedText type="defaultSemiBold">Loading...</ThemedText>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}><ThemedText style={{ color: palette.muted }}>Loading video...</ThemedText></View>
      </SafeAreaView>
    );
  }

  if (!hasAccess) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.header}>
          <Clickable onPress={() => router.back()} hitSlop={8}><Ionicons name="arrow-back" size={24} color={palette.text} /></Clickable>
          <ThemedText type="defaultSemiBold">Access Denied</ThemedText>
          <View style={{ width: 24 }} />
        </View>
        <EmptyState icon="lock-closed-outline" title="Video Not Available" message="This video hasn't been shared with you yet." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}><Ionicons name="arrow-back" size={24} color={palette.text} /></Clickable>
        <View style={styles.headerCenter}>
          <ThemedText type="defaultSemiBold" numberOfLines={1}>{video.title}</ThemedText>
          <ThemedText style={[styles.headerSubtitle, { color: palette.muted }]}>by {video.coachName}</ThemedText>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.springify()}>
          <VideoPlayer videoUrl={video.videoUrl} thumbnailUrl={video.thumbnailUrl} duration={video.duration} annotations={filteredAnnotations} onAnnotationPress={handleAnnotationSelect} onTimeUpdate={handleTimeUpdate} initialPosition={currentTime} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(50).springify()}>
          <TimelineBar duration={video.duration} currentTime={currentTime} annotations={filteredAnnotations} onSeek={handleSeek} onAnnotationPress={handleAnnotationSelect} showLabels />
        </Animated.View>

        {/* Navigation controls */}
        <View style={[styles.navigationBar, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Clickable onPress={handlePreviousAnnotation} style={[styles.navButton, { borderColor: palette.border }]}>
            <Ionicons name="play-skip-back" size={18} color={palette.text} />
            <ThemedText style={styles.navButtonText}>Previous</ThemedText>
          </Clickable>
          <ThemedText style={[styles.annotationCount, { color: palette.muted }]}>{filteredAnnotations.length} annotations</ThemedText>
          <Clickable onPress={handleNextAnnotation} style={[styles.navButton, { borderColor: palette.border }]}>
            <ThemedText style={styles.navButtonText}>Next</ThemedText>
            <Ionicons name="play-skip-forward" size={18} color={palette.text} />
          </Clickable>
        </View>

        {/* Active Annotation */}
        {showAnnotationDetails && activeAnnotation && (
          <Animated.View entering={FadeIn.springify()}>
            <SurfaceCard style={[styles.activeCard, { borderColor: ANNOTATION_TYPE_CONFIG[activeAnnotation.type].color }]}>
              <View style={styles.activeHeader}>
                <AnnotationBadge type={activeAnnotation.type} variant="filled" size="medium" />
                <ThemedText style={[styles.activeTimestamp, { color: palette.muted }]}>{videoService.formatTimestamp(activeAnnotation.timestamp)}</ThemedText>
              </View>
              <ThemedText type="defaultSemiBold">{activeAnnotation.label}</ThemedText>
              {activeAnnotation.note && <ThemedText style={{ color: palette.muted, ...Typography.bodySmall }}>{activeAnnotation.note}</ThemedText>}
              {activeAnnotation.createdByName && (
                <View style={styles.activeFooter}>
                  <Ionicons name="person-outline" size={12} color={palette.muted} />
                  <ThemedText style={[styles.activeCreator, { color: palette.muted }]}>{activeAnnotation.createdByName}</ThemedText>
                </View>
              )}
            </SurfaceCard>
          </Animated.View>
        )}

        {/* Type Filter */}
        <SurfaceCard style={styles.filterCard}>
          <ThemedText type="defaultSemiBold" style={styles.filterTitle}>Filter by Type</ThemedText>
          <AnnotationTypesSummary counts={annotationStats.byType} selectedTypes={selectedTypes} onTypePress={handleToggleType} />
        </SurfaceCard>

        {/* Annotations List */}
        <SurfaceCard style={styles.listCard}>
          {filteredAnnotations.length === 0 ? (
            <View style={styles.emptyList}>
              <Ionicons name="bookmark-outline" size={40} color={palette.muted} />
              <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
                {video.annotations.length === 0 ? 'No annotations on this video yet' : 'No annotations match your filter'}
              </ThemedText>
            </View>
          ) : (
            <AnnotationPanel annotations={filteredAnnotations} currentTime={currentTime} onAnnotationSelect={handleAnnotationSelect} isEditable={false} title={`Coach Notes (${filteredAnnotations.length})`} />
          )}
        </SurfaceCard>

        {/* Video Info */}
        <SurfaceCard style={styles.infoCard}>
          <ThemedText type="defaultSemiBold">Video Details</ThemedText>
          <View style={styles.infoRow}><ThemedText style={{ color: palette.muted }}>Coach</ThemedText><ThemedText>{video.coachName}</ThemedText></View>
          <View style={styles.infoRow}><ThemedText style={{ color: palette.muted }}>Duration</ThemedText><ThemedText>{videoService.formatDuration(video.duration)}</ThemedText></View>
          <View style={styles.infoRow}><ThemedText style={{ color: palette.muted }}>Uploaded</ThemedText><ThemedText>{new Date(video.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</ThemedText></View>
          {video.description && <View style={styles.descSection}><ThemedText style={{ color: palette.muted }}>Description</ThemedText><ThemedText style={styles.descText}>{video.description}</ThemedText></View>}
          {video.tags.length > 0 && (
            <View style={styles.tagsSection}>
              <ThemedText style={{ color: palette.muted }}>Tags</ThemedText>
              <View style={styles.tagsRow}>
                {video.tags.map((tag) => (
                  <View key={tag} style={[styles.tag, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
                    <ThemedText style={[styles.tagText, { color: palette.tint }]}>{tag}</ThemedText>
                  </View>
                ))}
              </View>
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.md },
  headerCenter: { flex: 1 },
  headerSubtitle: { ...Typography.caption },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.lg, paddingTop: 0, gap: Spacing.md },
  navigationBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.sm, borderRadius: Radii.lg, borderWidth: 1 },
  navButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radii.md, borderWidth: 1, gap: Spacing.xs },
  navButtonText: { ...Typography.smallSemiBold },
  annotationCount: { ...Typography.caption },
  activeCard: { padding: Spacing.md, borderWidth: 2, gap: Spacing.sm },
  activeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  activeTimestamp: { ...Typography.smallSemiBold },
  activeFooter: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs, marginTop: Spacing.xs },
  activeCreator: { ...Typography.caption },
  filterCard: { padding: Spacing.md, gap: Spacing.sm },
  filterTitle: { ...Typography.bodySmall },
  listCard: { padding: 0, minHeight: 200, overflow: 'hidden' },
  emptyList: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm },
  emptyText: { ...Typography.bodySmall, textAlign: 'center' },
  infoCard: { padding: Spacing.md, gap: Spacing.md },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  descSection: { gap: Spacing.xs },
  descText: { ...Typography.bodySmall },
  tagsSection: { gap: Spacing.xs },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  tag: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xxs, borderRadius: Radii.sm },
  tagText: { ...Typography.caption },
  bottomSpacer: { height: 40 },
});
