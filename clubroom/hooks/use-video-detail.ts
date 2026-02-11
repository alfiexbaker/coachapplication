/**
 * Hook: useVideoDetail
 *
 * Manages video detail screen state: load video, annotations, share, visibility, delete.
 * Used by app/videos/[id].tsx
 */

import { useState, useEffect, useCallback } from 'react';
import { Alert, Share } from 'react-native';
import { router } from 'expo-router';

import { useAuth } from '@/hooks/use-auth';
import { videoService } from '@/services/video-service';
import type { SessionVideo, VideoAnnotation, VideoAnnotationType } from '@/constants/types';
import { createLogger } from '@/utils/logger';
import type { ScreenStatus } from '@/hooks/use-screen';
import { serviceError, type ServiceError } from '@/types/result';

const logger = createLogger('useVideoDetail');

export function useVideoDetail(id: string | undefined) {
  const { currentUser } = useAuth();

  const [video, setVideo] = useState<SessionVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ServiceError | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [showAnnotationModal, setShowAnnotationModal] = useState(false);

  const isOwner = video?.coachId === currentUser?.id;

  const loadVideo = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await videoService.getVideo(id);
      setVideo(data);
    } catch (loadError) {
      logger.error('Failed to load video:', loadError);
      setVideo(null);
      setError(serviceError('UNKNOWN', 'Failed to load video details.', loadError));
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

  const handleSeekToAnnotation = useCallback((annotation: VideoAnnotation) => {
    setCurrentTime(annotation.timestamp);
  }, []);

  const handleQuickAnnotation = useCallback((_type: VideoAnnotationType) => {
    setShowAnnotationModal(true);
  }, []);

  const handleSaveAnnotation = useCallback(async (annotation: Omit<VideoAnnotation, 'id'>) => {
    if (!video) return;
    await videoService.addAnnotation(video.id, annotation.timestamp, annotation.label, annotation.type, annotation.note);
    await loadVideo();
  }, [video, loadVideo]);

  const handleShare = useCallback(async () => {
    if (!video) return;
    try {
      await Share.share({ title: video.title, message: `Check out this training video: ${video.title}`, url: video.videoUrl });
    } catch (error) {
      logger.error('Failed to share:', error);
    }
  }, [video]);

  const handleToggleVisibility = useCallback(async () => {
    if (!video) return;
    try {
      if (video.visibility === 'PRIVATE') {
        await videoService.shareVideo(video.id, ['parent_1']);
        Alert.alert('Shared', 'Video has been shared with parents.');
      } else {
        await videoService.makePrivate(video.id);
        Alert.alert('Made Private', 'Video is now private.');
      }
      await loadVideo();
    } catch (error) {
      logger.error('Failed to toggle visibility:', error);
    }
  }, [video, loadVideo]);

  const handleDelete = useCallback(() => {
    if (!video) return;
    Alert.alert('Delete Video', 'Are you sure you want to delete this video? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
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
  }, [video]);

  const dismissAnnotationModal = useCallback(() => {
    setShowAnnotationModal(false);
  }, []);

  const status: ScreenStatus = loading && !video
    ? 'loading'
    : error && !video
      ? 'error'
      : !video
        ? 'empty'
        : 'success';

  return {
    video,
    loading,
    status,
    error,
    currentTime,
    showAnnotationModal,
    isOwner,
    retry: loadVideo,
    handleTimeUpdate, handleSeekToAnnotation, handleQuickAnnotation,
    handleSaveAnnotation, handleShare, handleToggleVisibility,
    handleDelete, dismissAnnotationModal, setCurrentTime,
  };
}
