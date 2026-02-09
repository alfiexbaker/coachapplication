/**
 * Hook: useVideoAnnotate
 *
 * Manages video annotation screen state: load video, CRUD annotations, export.
 * Used by app/videos/annotate/[id].tsx
 */

import { useState, useEffect, useCallback } from 'react';
import { Alert, Share } from 'react-native';

import { useAuth } from '@/hooks/use-auth';
import { videoService } from '@/services/video-service';
import type { SessionVideo, VideoAnnotation, VideoAnnotationType } from '@/constants/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('useVideoAnnotate');

type ViewMode = 'timeline' | 'list';

export function useVideoAnnotate(id: string | undefined) {
  const { currentUser } = useAuth();

  const [video, setVideo] = useState<SessionVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [showAnnotationForm, setShowAnnotationForm] = useState(false);
  const [editingAnnotation, setEditingAnnotation] = useState<VideoAnnotation | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [annotationStats, setAnnotationStats] = useState({
    total: 0,
    byType: { HIGHLIGHT: 0, IMPROVEMENT: 0, TECHNIQUE: 0, GENERAL: 0 },
    averagePerMinute: 0,
  });

  const isOwner = video?.coachId === currentUser?.id;

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

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  const handleSeek = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  const handleAnnotationSelect = useCallback((annotation: VideoAnnotation) => {
    setCurrentTime(annotation.timestamp);
  }, []);

  const handleQuickAnnotation = useCallback((_type: VideoAnnotationType) => {
    setEditingAnnotation(null);
    setShowAnnotationForm(true);
  }, []);

  const handleAddAnnotation = useCallback(() => {
    setEditingAnnotation(null);
    setShowAnnotationForm(true);
  }, []);

  const handleEditAnnotation = useCallback((annotation: VideoAnnotation) => {
    setEditingAnnotation(annotation);
    setShowAnnotationForm(true);
  }, []);

  const handleDeleteAnnotation = useCallback((annotation: VideoAnnotation) => {
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
          },
        },
      ]
    );
  }, [video, loadVideo]);

  const handleSaveAnnotation = useCallback(async (
    annotation: Omit<VideoAnnotation, 'id'>
  ) => {
    if (!video) return;

    try {
      if (editingAnnotation) {
        await videoService.updateAnnotation(video.id, editingAnnotation.id, {
          label: annotation.label,
          note: annotation.note,
          type: annotation.type,
        });
      } else {
        await videoService.createAnnotation(
          video.id,
          {
            timestamp: annotation.timestamp,
            label: annotation.label,
            note: annotation.note,
            type: annotation.type,
          },
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
  }, [video, editingAnnotation, currentUser, loadVideo]);

  const handleExport = useCallback(async () => {
    if (!video) return;

    try {
      const textSummary = await videoService.generateTextSummary(video.id);
      await Share.share({
        title: `Annotations: ${video.title}`,
        message: textSummary,
      });
    } catch (error) {
      logger.error('Failed to export:', error);
      Alert.alert('Error', 'Failed to export annotations.');
    }
  }, [video]);

  const handleClearAll = useCallback(() => {
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
          },
        },
      ]
    );
  }, [video, loadVideo]);

  const dismissAnnotationForm = useCallback(() => {
    setShowAnnotationForm(false);
    setEditingAnnotation(null);
  }, []);

  return {
    video,
    loading,
    currentTime,
    showAnnotationForm,
    editingAnnotation,
    viewMode,
    annotationStats,
    isOwner,
    setViewMode,
    handleTimeUpdate,
    handleSeek,
    handleAnnotationSelect,
    handleQuickAnnotation,
    handleAddAnnotation,
    handleEditAnnotation,
    handleDeleteAnnotation,
    handleSaveAnnotation,
    handleExport,
    handleClearAll,
    dismissAnnotationForm,
  };
}
