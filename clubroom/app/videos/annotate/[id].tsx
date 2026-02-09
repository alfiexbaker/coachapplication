import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { VideoPlayer } from '@/components/video/video-player';
import { TimelineBar } from '@/components/video/TimelineBar';
import { AnnotationPanel } from '@/components/video/AnnotationPanel';
import { AnnotationForm } from '@/components/video/AnnotationForm';
import { AnnotationTypesSummary } from '@/components/video/AnnotationBadge';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorBoundary } from '@/components/error-boundary';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useVideoAnnotate } from '@/hooks/use-video-annotate';
import { videoService, ANNOTATION_TYPE_CONFIG } from '@/services/video-service';
import type { VideoAnnotationType } from '@/constants/types';

export default function CoachAnnotateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: palette } = useTheme();
  const {
    video, loading, currentTime, showAnnotationForm, editingAnnotation,
    viewMode, annotationStats, isOwner,
    setViewMode,
    handleTimeUpdate, handleSeek, handleAnnotationSelect, handleQuickAnnotation,
    handleAddAnnotation, handleEditAnnotation, handleDeleteAnnotation,
    handleSaveAnnotation, handleExport, handleClearAll, dismissAnnotationForm,
  } = useVideoAnnotate(id);

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

  if (!isOwner) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.header}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="defaultSemiBold">Access Denied</ThemedText>
          <View style={{ width: 24 }} />
        </View>
        <EmptyState icon="lock-closed-outline" title="Not Authorized" message="Only the coach who uploaded this video can add annotations." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Clickable>
        <View style={styles.headerCenter}>
          <ThemedText type="defaultSemiBold" numberOfLines={1}>Annotate Video</ThemedText>
        </View>
        <Clickable accessibilityLabel="Export annotations" onPress={handleExport} hitSlop={8}>
          <Ionicons name="share-outline" size={22} color={palette.text} />
        </Clickable>
      </View>

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
          <View style={[styles.toolbar, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Clickable onPress={handleAddAnnotation} style={[styles.addButton, { backgroundColor: palette.tint }]}>
              <Ionicons name="add" size={20} color={palette.onPrimary} />
              <ThemedText style={[styles.addButtonText, { color: palette.onPrimary }]}>Add at {videoService.formatTimestamp(currentTime)}</ThemedText>
            </Clickable>
            <View style={styles.quickTypes}>
              {(['HIGHLIGHT', 'IMPROVEMENT', 'TECHNIQUE'] as VideoAnnotationType[]).map((type) => {
                const config = ANNOTATION_TYPE_CONFIG[type];
                return (
                  <Clickable key={type} onPress={() => handleQuickAnnotation(type)} style={[styles.quickTypeButton, { backgroundColor: withAlpha(config.color, 0.15) }]}>
                    <Ionicons name={config.icon as keyof typeof Ionicons.glyphMap} size={16} color={config.color} />
                  </Clickable>
                );
              })}
            </View>
          </View>
        </Animated.View>

        {showAnnotationForm && (
          <Animated.View entering={FadeInDown.springify()}>
            <AnnotationForm videoId={video.id} videoDuration={video.duration} currentTimestamp={editingAnnotation?.timestamp ?? currentTime} existingAnnotation={editingAnnotation ?? undefined} onSave={handleSaveAnnotation} onCancel={dismissAnnotationForm} onTimestampChange={handleSeek} />
          </Animated.View>
        )}

        {/* View Mode Toggle */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <View style={styles.viewModeContainer}>
            <Clickable
              onPress={() => setViewMode('timeline')}
              style={[styles.viewModeButton, { backgroundColor: viewMode === 'timeline' ? palette.tint : palette.surface, borderColor: viewMode === 'timeline' ? palette.tint : palette.border }]}
            >
              <Ionicons name="git-commit-outline" size={16} color={viewMode === 'timeline' ? palette.onPrimary : palette.text} />
              <ThemedText style={[styles.viewModeText, { color: viewMode === 'timeline' ? palette.onPrimary : palette.text }]}>Timeline</ThemedText>
            </Clickable>
            <Clickable
              onPress={() => setViewMode('list')}
              style={[styles.viewModeButton, { backgroundColor: viewMode === 'list' ? palette.tint : palette.surface, borderColor: viewMode === 'list' ? palette.tint : palette.border }]}
            >
              <Ionicons name="list-outline" size={16} color={viewMode === 'list' ? palette.onPrimary : palette.text} />
              <ThemedText style={[styles.viewModeText, { color: viewMode === 'list' ? palette.onPrimary : palette.text }]}>List</ThemedText>
            </Clickable>
          </View>
        </Animated.View>

        {/* Stats */}
        <SurfaceCard style={styles.statsCard}>
          <View style={styles.statsHeader}>
            <ThemedText type="defaultSemiBold">Annotations</ThemedText>
            <View style={styles.statsInfo}>
              <ThemedText style={[styles.statText, { color: palette.muted }]}>{annotationStats.total} total</ThemedText>
              <ThemedText style={[styles.statText, { color: palette.muted }]}>{annotationStats.averagePerMinute}/min</ThemedText>
            </View>
          </View>
          <AnnotationTypesSummary counts={annotationStats.byType} onTypePress={undefined} />
        </SurfaceCard>

        {/* Annotations Panel */}
        <SurfaceCard style={styles.annotationsCard}>
          <AnnotationPanel annotations={video.annotations} currentTime={currentTime} onAnnotationSelect={handleAnnotationSelect} onAnnotationEdit={handleEditAnnotation} onAnnotationDelete={handleDeleteAnnotation} isEditable title="All Annotations" />
        </SurfaceCard>

        {/* Actions */}
        {video.annotations.length > 0 && (
          <View style={styles.actionsRow}>
            <Clickable onPress={handleExport} style={[styles.actionButton, { borderColor: palette.border }]}>
              <Ionicons name="download-outline" size={18} color={palette.tint} />
              <ThemedText style={{ color: palette.tint, fontWeight: '600' }}>Export</ThemedText>
            </Clickable>
            <Clickable onPress={handleClearAll} style={[styles.actionButton, { borderColor: palette.error }]}>
              <Ionicons name="trash-outline" size={18} color={palette.error} />
              <ThemedText style={{ color: palette.error, fontWeight: '600' }}>Clear All</ThemedText>
            </Clickable>
          </View>
        )}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.md },
  headerCenter: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.lg, paddingTop: 0, gap: Spacing.md },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.sm, borderRadius: Radii.lg, borderWidth: 1 },
  addButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radii.md, gap: Spacing.xs },
  addButtonText: { ...Typography.smallSemiBold },
  quickTypes: { flexDirection: 'row', gap: Spacing.xs },
  quickTypeButton: { width: 36, height: 36, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center' },
  statsCard: { padding: Spacing.md, gap: Spacing.md },
  statsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statsInfo: { flexDirection: 'row', gap: Spacing.md },
  statText: { ...Typography.caption },
  annotationsCard: { padding: 0, minHeight: 300 },
  viewModeContainer: { flexDirection: 'row', gap: Spacing.xs },
  viewModeButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: Spacing.sm, borderRadius: Radii.md, borderWidth: 1 },
  viewModeText: { ...Typography.smallSemiBold },
  actionsRow: { flexDirection: 'row', gap: Spacing.sm },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.sm, borderRadius: Radii.md, borderWidth: 1, gap: Spacing.xs },
  bottomSpacer: { height: 40 },
});
