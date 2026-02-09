/**
 * Coach Video Annotation Screen
 *
 * Allows coaches to add timestamped annotations to session videos.
 * Features:
 * - Video playback with controls
 * - Add/edit/delete annotations at specific timestamps
 * - Quick annotation toolbar
 * - Timeline with annotation markers
 * - Export annotations for sharing
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, ScrollView, Alert, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { createLogger } from '@/utils/logger';
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
import { useAuth } from '@/hooks/use-auth';
import { videoService, ANNOTATION_TYPE_CONFIG } from '@/services/video-service';
import type { SessionVideo, VideoAnnotation, VideoAnnotationType } from '@/constants/types';

const logger = createLogger('CoachAnnotateScreen');

type ViewMode = 'timeline' | 'list';

export default function CoachAnnotateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: palette } = useTheme();
  const { currentUser } = useAuth();

  // State
  const [video, setVideo] = useState<SessionVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_isPlaying, setIsPlaying] = useState(false);
  const [showAnnotationForm, setShowAnnotationForm] = useState(false);
  const [editingAnnotation, setEditingAnnotation] = useState<VideoAnnotation | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [annotationStats, setAnnotationStats] = useState({
    total: 0,
    byType: { HIGHLIGHT: 0, IMPROVEMENT: 0, TECHNIQUE: 0, GENERAL: 0 },
    averagePerMinute: 0 });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _videoRef = useRef<{ seekTo: (time: number) => void } | null>(null);

  const isOwner = video?.coachId === currentUser?.id;

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

  // Handlers
  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);
  };

  const handleSeek = (time: number) => {
    setCurrentTime(time);
  };

  const handleAnnotationSelect = (annotation: VideoAnnotation) => {
    setCurrentTime(annotation.timestamp);
  };

  const handleQuickAnnotation = (type: VideoAnnotationType) => {
    setEditingAnnotation(null);
    setShowAnnotationForm(true);
  };

  const handleAddAnnotation = () => {
    setEditingAnnotation(null);
    setShowAnnotationForm(true);
  };

  const handleEditAnnotation = (annotation: VideoAnnotation) => {
    setEditingAnnotation(annotation);
    setShowAnnotationForm(true);
  };

  const handleDeleteAnnotation = (annotation: VideoAnnotation) => {
    Alert.alert(
      'Delete Annotation',
      `Are you sure you want to delete "${annotation.label}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!video) return;
            try {
              await videoService.deleteAnnotation(video.id, annotation.id);
              await loadVideo();
            } catch (error) {
              logger.error('Failed to delete annotation:', error);
              Alert.alert('Error', 'Failed to delete annotation.');
            }
          } },
      ]
    );
  };

  const handleSaveAnnotation = async (
    annotation: Omit<VideoAnnotation, 'id'>
  ) => {
    if (!video) return;

    try {
      if (editingAnnotation) {
        await videoService.updateAnnotation(video.id, editingAnnotation.id, {
          label: annotation.label,
          note: annotation.note,
          type: annotation.type });
      } else {
        await videoService.createAnnotation(
          video.id,
          {
            timestamp: annotation.timestamp,
            label: annotation.label,
            note: annotation.note,
            type: annotation.type },
          currentUser?.id,
          currentUser?.name
        );
      }

      setShowAnnotationForm(false);
      setEditingAnnotation(null);
      await loadVideo();
    } catch (error) {
      throw error;
    }
  };

  const handleExport = async () => {
    if (!video) return;

    try {
      const textSummary = await videoService.generateTextSummary(video.id);

      await Share.share({
        title: `Annotations: ${video.title}`,
        message: textSummary });
    } catch (error) {
      logger.error('Failed to export:', error);
      Alert.alert('Error', 'Failed to export annotations.');
    }
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Annotations',
      'Are you sure you want to delete all annotations? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            if (!video) return;
            try {
              await videoService.clearAnnotations(video.id);
              await loadVideo();
            } catch (error) {
              logger.error('Failed to clear annotations:', error);
              Alert.alert('Error', 'Failed to clear annotations.');
            }
          } },
      ]
    );
  };

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

  // Permission check
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
        <EmptyState
          icon="lock-closed-outline"
          title="Not Authorized"
          message="Only the coach who uploaded this video can add annotations."
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
            Annotate Video
          </ThemedText>
        </View>
        <View style={styles.headerActions}>
          <Clickable onPress={handleExport} hitSlop={8}>
            <Ionicons name="share-outline" size={22} color={palette.text} />
          </Clickable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Video Player */}
        <Animated.View entering={FadeInDown.springify()}>
          <ErrorBoundary>
            <VideoPlayer
              videoUrl={video.videoUrl}
              thumbnailUrl={video.thumbnailUrl}
              duration={video.duration}
              annotations={video.annotations}
              onAnnotationPress={handleAnnotationSelect}
              onTimeUpdate={handleTimeUpdate}
              initialPosition={currentTime}
            />
          </ErrorBoundary>
        </Animated.View>

        {/* Timeline Bar */}
        <Animated.View entering={FadeInDown.delay(50).springify()}>
          <TimelineBar
            duration={video.duration}
            currentTime={currentTime}
            annotations={video.annotations}
            onSeek={handleSeek}
            onAnnotationPress={handleAnnotationSelect}
            showLabels
          />
        </Animated.View>

        {/* Quick Add Toolbar */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <View style={[styles.toolbar, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <View style={styles.toolbarLeft}>
              <Clickable
                onPress={handleAddAnnotation}
                style={[styles.addButton, { backgroundColor: palette.tint }]}
              >
                <Ionicons name="add" size={20} color={palette.onPrimary} />
                <ThemedText style={[styles.addButtonText, { color: palette.onPrimary }]}>Add at {videoService.formatTimestamp(currentTime)}</ThemedText>
              </Clickable>
            </View>

            <View style={styles.toolbarRight}>
              <View style={styles.quickTypes}>
                {(['HIGHLIGHT', 'IMPROVEMENT', 'TECHNIQUE'] as VideoAnnotationType[]).map((type) => {
                  const config = ANNOTATION_TYPE_CONFIG[type];
                  return (
                    <Clickable
                      key={type}
                      onPress={() => handleQuickAnnotation(type)}
                      style={[styles.quickTypeButton, { backgroundColor: withAlpha(config.color, 0.15) }]}
                    >
                      <Ionicons name={config.icon as keyof typeof Ionicons.glyphMap} size={16} color={config.color} />
                    </Clickable>
                  );
                })}
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Annotation Form (when adding/editing) */}
        {showAnnotationForm && (
          <Animated.View entering={FadeInDown.springify()}>
            <AnnotationForm
              videoId={video.id}
              videoDuration={video.duration}
              currentTimestamp={editingAnnotation?.timestamp ?? currentTime}
              existingAnnotation={editingAnnotation ?? undefined}
              onSave={handleSaveAnnotation}
              onCancel={() => {
                setShowAnnotationForm(false);
                setEditingAnnotation(null);
              }}
              onTimestampChange={handleSeek}
            />
          </Animated.View>
        )}

        {/* Stats Summary */}
        <Animated.View entering={FadeInDown.delay(150).springify()}>
          <SurfaceCard style={styles.statsCard}>
            <View style={styles.statsHeader}>
              <ThemedText type="defaultSemiBold">Annotations</ThemedText>
              <View style={styles.statsInfo}>
                <ThemedText style={[styles.statText, { color: palette.muted }]}>
                  {annotationStats.total} total
                </ThemedText>
                <ThemedText style={[styles.statText, { color: palette.muted }]}>
                  {annotationStats.averagePerMinute}/min
                </ThemedText>
              </View>
            </View>

            <AnnotationTypesSummary
              counts={annotationStats.byType}
              onTypePress={undefined}
            />
          </SurfaceCard>
        </Animated.View>

        {/* View Mode Toggle */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <View style={styles.viewModeContainer}>
            <Clickable
              onPress={() => setViewMode('timeline')}
              style={[
                styles.viewModeButton,
                {
                  backgroundColor: viewMode === 'timeline' ? palette.tint : palette.surface,
                  borderColor: viewMode === 'timeline' ? palette.tint : palette.border },
              ]}
            >
              <Ionicons
                name="git-branch-outline"
                size={16}
                color={viewMode === 'timeline' ? palette.onPrimary : palette.text}
              />
              <ThemedText
                style={[
                  styles.viewModeText,
                  { color: viewMode === 'timeline' ? palette.onPrimary : palette.text },
                ]}
              >
                Timeline
              </ThemedText>
            </Clickable>
            <Clickable
              onPress={() => setViewMode('list')}
              style={[
                styles.viewModeButton,
                {
                  backgroundColor: viewMode === 'list' ? palette.tint : palette.surface,
                  borderColor: viewMode === 'list' ? palette.tint : palette.border },
              ]}
            >
              <Ionicons
                name="list-outline"
                size={16}
                color={viewMode === 'list' ? palette.onPrimary : palette.text}
              />
              <ThemedText
                style={[
                  styles.viewModeText,
                  { color: viewMode === 'list' ? palette.onPrimary : palette.text },
                ]}
              >
                List
              </ThemedText>
            </Clickable>
          </View>
        </Animated.View>

        {/* Annotations Panel */}
        <Animated.View entering={FadeInDown.delay(250).springify()}>
          <SurfaceCard style={styles.annotationsCard}>
            <AnnotationPanel
              annotations={video.annotations}
              currentTime={currentTime}
              onAnnotationSelect={handleAnnotationSelect}
              onAnnotationEdit={handleEditAnnotation}
              onAnnotationDelete={handleDeleteAnnotation}
              isEditable
              title="All Annotations"
            />
          </SurfaceCard>
        </Animated.View>

        {/* Actions */}
        {video.annotations.length > 0 && (
          <Animated.View entering={FadeInDown.delay(300).springify()}>
            <View style={styles.actionsRow}>
              <Clickable
                onPress={handleExport}
                style={[styles.actionButton, { borderColor: palette.border }]}
              >
                <Ionicons name="download-outline" size={18} color={palette.tint} />
                <ThemedText style={{ color: palette.tint, fontWeight: '600' }}>
                  Export
                </ThemedText>
              </Clickable>
              <Clickable
                onPress={handleClearAll}
                style={[styles.actionButton, { borderColor: palette.error }]}
              >
                <Ionicons name="trash-outline" size={18} color={palette.error} />
                <ThemedText style={{ color: palette.error, fontWeight: '600' }}>
                  Clear All
                </ThemedText>
              </Clickable>
            </View>
          </Animated.View>
        )}

        <View style={styles.bottomSpacer} />
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
  headerCenter: {
    flex: 1 },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.sm },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center' },
  content: {
    padding: Spacing.lg,
    paddingTop: 0,
    gap: Spacing.md },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.sm,
    borderRadius: Radii.lg,
    borderWidth: 1 },
  toolbarLeft: {
    flex: 1 },
  toolbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    gap: Spacing.xs },
  addButtonText: {
    ...Typography.smallSemiBold },
  quickTypes: {
    flexDirection: 'row',
    gap: Spacing.xs },
  quickTypeButton: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center' },
  statsCard: {
    padding: Spacing.md,
    gap: Spacing.md },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between' },
  statsInfo: {
    flexDirection: 'row',
    gap: Spacing.md },
  statText: {
    ...Typography.caption },
  viewModeContainer: {
    flexDirection: 'row',
    gap: Spacing.xs },
  viewModeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.xs },
  viewModeText: {
    ...Typography.smallSemiBold },
  annotationsCard: {
    padding: 0,
    minHeight: 300 },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.xs },
  bottomSpacer: {
    height: 40 } });