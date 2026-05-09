/**
 * Hook: useVideoDetail
 *
 * Manages video detail screen state: load video, annotations, share, visibility, delete.
 * Used by app/videos/[id].tsx
 */

import { useState, useCallback } from 'react';
import { Share } from 'react-native';
import { router } from 'expo-router';

import { useAuth } from '@/hooks/use-auth';
import { useScreen } from '@/hooks/use-screen';
import { videoService } from '@/services/video-service';
import type { SessionVideo, VideoAnnotation, VideoAnnotationType } from '@/constants/types';
import { createLogger } from '@/utils/logger';
import type { ScreenStatus } from '@/hooks/use-screen';
import { err, ok, serviceError, type ServiceError } from '@/types/result';
import { uiFeedback } from '@/services/ui-feedback';

const logger = createLogger('useVideoDetail');

export function useVideoDetail(id: string | undefined) {
  const { currentUser } = useAuth();

  const [currentTime, setCurrentTime] = useState(0);
  const [showAnnotationModal, setShowAnnotationModal] = useState(false);

  const loadVideo = useCallback(async () => {
    if (!id) {
      return err(serviceError('VALIDATION', 'Missing video id.'));
    }

    try {
      const data = await videoService.getVideo(id);
      return ok<SessionVideo | null>(data);
    } catch (loadError) {
      logger.error('Failed to load video:', loadError);
      return err(serviceError('UNKNOWN', 'Failed to load video details.', loadError));
    }
  }, [id]);

  const { data: video, status, error, onRefresh, retry } = useScreen<SessionVideo | null>({
    load: loadVideo,
    deps: [id],
    isEmpty: (value) => !value,
    refetchOnFocus: true,
    loadingStrategy: 'section-skeleton',
    dataKey: id ? `video-detail:${id}` : 'video-detail:missing',
  });

  const isOwner = video?.coachId === currentUser?.id;

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  const handleSeekToAnnotation = useCallback((annotation: VideoAnnotation) => {
    setCurrentTime(annotation.timestamp);
  }, []);

  const handleQuickAnnotation = useCallback((_type: VideoAnnotationType) => {
    setShowAnnotationModal(true);
  }, []);

  const handleSaveAnnotation = useCallback(
    async (annotation: Omit<VideoAnnotation, 'id'>) => {
      if (!video) return;
      if (annotation.timestamp < 0) {
        uiFeedback.showToast('Timestamp cannot be negative.', 'error');
        return;
      }
      if (annotation.timestamp > video.duration) {
        const mins = Math.floor(video.duration / 60);
        const secs = Math.floor(video.duration % 60);
        uiFeedback.showToast(`Timestamp cannot exceed ${mins}:${secs.toString().padStart(2, '0')}.`, 'error');
        return;
      }
      if (!annotation.label.trim()) {
        uiFeedback.showToast('Please enter a label for this annotation.', 'error');
        return;
      }
      if ((annotation.note?.trim().length ?? 0) > 500) {
        uiFeedback.showToast('Maximum note length is 500 characters.');
        return;
      }
      const duplicateTimestamp = video.annotations.some((entry) => entry.timestamp === annotation.timestamp);
      if (duplicateTimestamp) {
        uiFeedback.showToast('An annotation already exists at this timestamp.');
        return;
      }
      await videoService.addAnnotation(
        video.id,
        annotation.timestamp,
        annotation.label.trim(),
        annotation.type,
        annotation.note?.trim() || undefined,
      );
      onRefresh();
    },
    [video, onRefresh],
  );

  const handleShare = useCallback(async () => {
    if (!video) return;
    try {
      const shareUrl = `clubroom://videos/${video.id}`;
      await Share.share({
        title: video.title,
        message: `Open this training video in Clubroom: ${shareUrl}`,
        url: shareUrl,
      });
    } catch (error) {
      logger.error('Failed to share:', error);
    }
  }, [video]);

  const handleToggleVisibility = useCallback(async () => {
    if (!video) return;
    try {
      if (video.visibility === 'PRIVATE') {
        await videoService.shareVideo(video.id, []);
        uiFeedback.showToast('Video has been shared with the linked family.');
      } else {
        await videoService.makePrivate(video.id);
        uiFeedback.showToast('Video is now private.');
      }
      onRefresh();
    } catch (error) {
      logger.error('Failed to toggle visibility:', error);
    }
  }, [video, onRefresh]);

  const handleDelete = useCallback(() => {
    if (!video) return;
    uiFeedback.alert(
      'Delete Video',
      'Are you sure you want to delete this video? This cannot be undone.',
      [
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
      ],
    );
  }, [video]);

  const dismissAnnotationModal = useCallback(() => {
    setShowAnnotationModal(false);
  }, []);

  return {
    video,
    loading: status === 'loading',
    status: status as ScreenStatus,
    error: status === 'error' ? (error as ServiceError | null) : null,
    currentTime,
    showAnnotationModal,
    isOwner,
    retry,
    handleTimeUpdate,
    handleSeekToAnnotation,
    handleQuickAnnotation,
    handleSaveAnnotation,
    handleShare,
    handleToggleVisibility,
    handleDelete,
    dismissAnnotationModal,
    setCurrentTime,
  };
}
