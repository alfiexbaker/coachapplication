/**
 * Hook: useVideoReview
 *
 * Manages athlete video review screen state: load video, navigate annotations, filter.
 * Used by app/videos/review/[id].tsx
 */

import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';

import { useAuth } from '@/hooks/use-auth';
import { videoService } from '@/services/video-service';
import type { SessionVideo, VideoAnnotation, VideoAnnotationType } from '@/constants/types';
import { createLogger } from '@/utils/logger';
import type { ScreenStatus } from '@/hooks/use-screen';
import { serviceError, type ServiceError } from '@/types/result';

const logger = createLogger('useVideoReview');

export function useVideoReview(id: string | undefined) {
  const { currentUser } = useAuth();

  const [video, setVideo] = useState<SessionVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ServiceError | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeAnnotation, setActiveAnnotation] = useState<VideoAnnotation | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<VideoAnnotationType[]>([]);
  const [showAnnotationDetails, setShowAnnotationDetails] = useState(false);
  const [annotationStats, setAnnotationStats] = useState({
    total: 0,
    byType: { HIGHLIGHT: 0, IMPROVEMENT: 0, TECHNIQUE: 0, GENERAL: 0 },
    averagePerMinute: 0,
  });

  const hasAccess =
    video &&
    (video.athleteIds.includes(currentUser?.id ?? '') ||
      video.sharedWith.includes(currentUser?.id ?? '') ||
      video.visibility === 'PUBLIC');

  const loadVideo = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await videoService.getVideo(id);
      setVideo(data);

      if (data) {
        const stats = await videoService.getAnnotationStats(id);
        setAnnotationStats(stats);
      }
    } catch (loadError) {
      logger.error('Failed to load video:', loadError);
      setVideo(null);
      setError(serviceError('UNKNOWN', 'Failed to load review video.', loadError));
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

    const nearby = video.annotations.find((ann) => Math.abs(currentTime - ann.timestamp) < 2);

    if (nearby && nearby.id !== activeAnnotation?.id) {
      setActiveAnnotation(nearby);
      setShowAnnotationDetails(true);
    } else if (!nearby && showAnnotationDetails) {
      const timer = setTimeout(() => {
        if (!video.annotations.find((ann) => Math.abs(currentTime - ann.timestamp) < 2)) {
          setShowAnnotationDetails(false);
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [currentTime, video, activeAnnotation, showAnnotationDetails]);

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  const handleSeek = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  const handleAnnotationSelect = useCallback((annotation: VideoAnnotation) => {
    setCurrentTime(annotation.timestamp);
    setActiveAnnotation(annotation);
    setShowAnnotationDetails(true);
  }, []);

  const handleNextAnnotation = useCallback(async () => {
    if (!video) return;
    const next = await videoService.getNextAnnotation(video.id, currentTime);
    if (next) {
      setCurrentTime(next.timestamp);
      setActiveAnnotation(next);
      setShowAnnotationDetails(true);
    }
  }, [video, currentTime]);

  const handlePreviousAnnotation = useCallback(async () => {
    if (!video) return;
    const prev = await videoService.getPreviousAnnotation(video.id, currentTime);
    if (prev) {
      setCurrentTime(prev.timestamp);
      setActiveAnnotation(prev);
      setShowAnnotationDetails(true);
    }
  }, [video, currentTime]);

  const handleToggleType = useCallback((type: VideoAnnotationType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  }, []);

  const filteredAnnotations =
    video?.annotations.filter(
      (ann) => selectedTypes.length === 0 || selectedTypes.includes(ann.type),
    ) ?? [];

  const status: ScreenStatus =
    loading && !video ? 'loading' : error && !video ? 'error' : !video ? 'empty' : 'success';

  return {
    video,
    loading,
    status,
    error,
    currentTime,
    activeAnnotation,
    selectedTypes,
    showAnnotationDetails,
    annotationStats,
    hasAccess,
    filteredAnnotations,
    retry: loadVideo,
    handleTimeUpdate,
    handleSeek,
    handleAnnotationSelect,
    handleNextAnnotation,
    handlePreviousAnnotation,
    handleToggleType,
  };
}
