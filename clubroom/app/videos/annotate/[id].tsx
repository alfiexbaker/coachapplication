import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { VideoPlayer } from '@/components/video/video-player';
import { TimelineBar } from '@/components/video/TimelineBar';
import { AnnotationPanel } from '@/components/video/AnnotationPanel';
import { AnnotationForm } from '@/components/video/AnnotationForm';
import { AnnotationTypesSummary } from '@/components/video/AnnotationBadge';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorBoundary } from '@/components/error-boundary';
import { LoadingState, ErrorState } from '@/components/ui/screen-states';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { useVideoAnnotate } from '@/hooks/use-video-annotate';
import { videoService, ANNOTATION_TYPE_CONFIG } from '@/services/video-service';
import type { VideoAnnotationType } from '@/constants/types';
import { ok } from '@/types/result';

export default function CoachAnnotateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: palette } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  const {
    video, loading, status, error, retry, currentTime, showAnnotationForm, editingAnnotation,
    viewMode, annotationStats, isOwner,
    setViewMode,
    handleTimeUpdate, handleSeek, handleAnnotationSelect, handleQuickAnnotation,
    handleAddAnnotation, handleEditAnnotation, handleDeleteAnnotation,
    handleSaveAnnotation, handleExport, handleClearAll, dismissAnnotationForm,
  } = useVideoAnnotate(id);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <Row align="center" gap="md" style={styles.header}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="defaultSemiBold">Annotate Video</ThemedText>
          <View style={{ width: 24 }} />
        </Row>
        <LoadingState variant="detail" />
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <ErrorState message={error?.message ?? 'Failed to load video annotation workspace.'} onRetry={retry} />
      </SafeAreaView>
    );
  }

  if (status === 'empty' || !video) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <EmptyState icon="videocam-outline" title="Video not found" message="This video is unavailable for annotation." />
      </SafeAreaView>
    );
  }

  if (!isOwner) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <Row align="center" gap="md" style={styles.header}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="defaultSemiBold">Access Denied</ThemedText>
          <View style={{ width: 24 }} />
        </Row>
        <EmptyState icon="lock-closed-outline" title="Not Authorized" message="Only the coach who uploaded this video can add annotations." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <Row align="center" gap="md" style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Clickable>
        <View style={styles.headerCenter}>
          <ThemedText type="defaultSemiBold" numberOfLines={1}>Annotate Video</ThemedText>
        </View>
        <Clickable accessibilityLabel="Export annotations" onPress={handleExport} hitSlop={8}>
          <Ionicons name="share-outline" size={22} color={palette.text} />
        </Clickable>
      </Row>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.springify()}>
          <ErrorBoundary>
            <VideoPlayer videoUrl={video.videoUrl} thumbnailUrl={video.thumbnailUrl} duration={video.duration} annotations={video.annotations} onAnnotationPress={handleAnnotationSelect} onTimeUpdate={handleTimeUpdate} initialPosition={currentTime} />
          </ErrorBoundary>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(50).springify()}>
          <TimelineBar duration={video.duration} currentTime={currentTime} annotations={video.annotations} onSeek={handleSeek} onAnnotationPress={handleAnnotationSelect} showLabels />
        </Animated.View>

        {/* Quick Add Toolbar */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <Row align="center" justify="space-between" style={[styles.toolbar, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Clickable onPress={handleAddAnnotation} style={[styles.addButton, { backgroundColor: palette.tint }]}>
              <Row align="center" gap="xs">
                <Ionicons name="add" size={20} color={palette.onPrimary} />
                <ThemedText style={[styles.addButtonText, { color: palette.onPrimary }]}>Add at {videoService.formatTimestamp(currentTime)}</ThemedText>
              </Row>
            </Clickable>
            <Row gap="xs">
              {(['HIGHLIGHT', 'IMPROVEMENT', 'TECHNIQUE'] as VideoAnnotationType[]).map((type) => {
                const config = ANNOTATION_TYPE_CONFIG[type];
                return (
                  <Clickable key={type} onPress={() => handleQuickAnnotation(type)} style={[styles.quickTypeButton, { backgroundColor: withAlpha(config.color, 0.15) }]}>
                    <Ionicons name={config.icon as keyof typeof Ionicons.glyphMap} size={16} color={config.color} />
                  </Clickable>
                );
              })}
            </Row>
          </Row>
        </Animated.View>

        {showAnnotationForm && (
          <Animated.View entering={FadeInDown.springify()}>
            <AnnotationForm videoId={video.id} videoDuration={video.duration} currentTimestamp={editingAnnotation?.timestamp ?? currentTime} existingAnnotation={editingAnnotation ?? undefined} onSave={handleSaveAnnotation} onCancel={dismissAnnotationForm} onTimestampChange={handleSeek} />
          </Animated.View>
        )}

        {/* View Mode Toggle */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <Row gap="xs">
            <Clickable
              onPress={() => setViewMode('timeline')}
              style={[styles.viewModeButton, { backgroundColor: viewMode === 'timeline' ? palette.tint : palette.surface, borderColor: viewMode === 'timeline' ? palette.tint : palette.border }]}
            >
              <Row align="center" justify="center" gap="xs" style={styles.viewModeButtonInner}>
                <Ionicons name="git-commit-outline" size={16} color={viewMode === 'timeline' ? palette.onPrimary : palette.text} />
                <ThemedText style={[styles.viewModeText, { color: viewMode === 'timeline' ? palette.onPrimary : palette.text }]}>Timeline</ThemedText>
              </Row>
            </Clickable>
            <Clickable
              onPress={() => setViewMode('list')}
              style={[styles.viewModeButton, { backgroundColor: viewMode === 'list' ? palette.tint : palette.surface, borderColor: viewMode === 'list' ? palette.tint : palette.border }]}
            >
              <Row align="center" justify="center" gap="xs" style={styles.viewModeButtonInner}>
                <Ionicons name="list-outline" size={16} color={viewMode === 'list' ? palette.onPrimary : palette.text} />
                <ThemedText style={[styles.viewModeText, { color: viewMode === 'list' ? palette.onPrimary : palette.text }]}>List</ThemedText>
              </Row>
            </Clickable>
          </Row>
        </Animated.View>

        {/* Stats */}
        <SurfaceCard style={styles.statsCard}>
          <Row align="center" justify="space-between">
            <ThemedText type="defaultSemiBold">Annotations</ThemedText>
            <Row gap="md">
              <ThemedText style={[styles.statText, { color: palette.muted }]}>{annotationStats.total} total</ThemedText>
              <ThemedText style={[styles.statText, { color: palette.muted }]}>{annotationStats.averagePerMinute}/min</ThemedText>
            </Row>
          </Row>
          <AnnotationTypesSummary counts={annotationStats.byType} onTypePress={undefined} />
        </SurfaceCard>

        {/* Annotations Panel */}
        <SurfaceCard style={styles.annotationsCard}>
          <AnnotationPanel annotations={video.annotations} currentTime={currentTime} onAnnotationSelect={handleAnnotationSelect} onAnnotationEdit={handleEditAnnotation} onAnnotationDelete={handleDeleteAnnotation} isEditable title="All Annotations" />
        </SurfaceCard>

        {/* Actions */}
        {video.annotations.length > 0 && (
          <Row gap="sm">
            <Clickable onPress={handleExport} style={[styles.actionButton, { borderColor: palette.border }]}>
              <Row align="center" justify="center" gap="xs" style={styles.actionButtonInner}>
                <Ionicons name="download-outline" size={18} color={palette.tint} />
                <ThemedText style={{ color: palette.tint, fontWeight: '600' }}>Export</ThemedText>
              </Row>
            </Clickable>
            <Clickable onPress={handleClearAll} style={[styles.actionButton, { borderColor: palette.error }]}>
              <Row align="center" justify="center" gap="xs" style={styles.actionButtonInner}>
                <Ionicons name="trash-outline" size={18} color={palette.error} />
                <ThemedText style={{ color: palette.error, fontWeight: '600' }}>Clear All</ThemedText>
              </Row>
            </Clickable>
          </Row>
        )}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  headerCenter: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.lg, paddingTop: 0, gap: Spacing.md },
  toolbar: { padding: Spacing.sm, borderRadius: Radii.lg, borderWidth: 1 },
  addButton: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radii.md },
  addButtonText: { ...Typography.smallSemiBold },
  quickTypes: {},
  quickTypeButton: { width: 36, height: 36, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center' },
  statsCard: { padding: Spacing.md, gap: Spacing.md },
  statsHeader: {},
  statsInfo: {},
  statText: { ...Typography.caption },
  annotationsCard: { padding: 0, minHeight: 300 },
  viewModeContainer: {},
  viewModeButton: { flex: 1, paddingVertical: Spacing.sm, borderRadius: Radii.md, borderWidth: 1 },
  viewModeButtonInner: { flex: 1 },
  viewModeText: { ...Typography.smallSemiBold },
  actionsRow: {},
  actionButton: { flex: 1, paddingVertical: Spacing.sm, borderRadius: Radii.md, borderWidth: 1 },
  actionButtonInner: { flex: 1 },
  bottomSpacer: { height: 40 },
});
