import { useCallback } from 'react';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { videoService } from '@/services/video-service';
import { createLogger } from '@/utils/logger';
import type { SessionVideo } from '@/constants/types';
import { err, ok, serviceError, type ServiceError } from '@/types/result';

const logger = createLogger('useVideosList');

export function useVideosList() {
  const { currentUser } = useAuth();

  const isCoach = currentUser?.role === 'COACH';

  const loadVideos = useCallback(async () => {
    if (!currentUser?.id) {
      return ok<{ videos: SessionVideo[]; stats: { totalVideos: number; totalViews: number; sharedCount: number } }>({
        videos: [],
        stats: { totalVideos: 0, totalViews: 0, sharedCount: 0 },
      });
    }
    try {
      const videos = await videoService.getCoachVideos(currentUser.id);
      const stats = await videoService.getCoachVideoStats(currentUser.id);
      return ok<{ videos: SessionVideo[]; stats: { totalVideos: number; totalViews: number; sharedCount: number } }>({
        videos,
        stats,
      });
    } catch (error) {
      logger.error('Failed to load videos:', error);
      return err(serviceError('UNKNOWN', 'Failed to load videos.', error));
    }
  }, [currentUser?.id]);

  const {
    data,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
  } = useScreen<{ videos: SessionVideo[]; stats: { totalVideos: number; totalViews: number; sharedCount: number } }>({
    load: loadVideos,
    deps: [currentUser?.id],
    isEmpty: (value) => value.videos.length === 0,
    refetchOnFocus: true,
  });

  const videos = data?.videos ?? [];
  const stats = data?.stats ?? { totalVideos: 0, totalViews: 0, sharedCount: 0 };

  const navigateToVideo = useCallback((videoId: string) => {
    router.push(Routes.video(videoId));
  }, []);

  const navigateToUpload = useCallback(() => {
    router.push(Routes.VIDEOS_UPLOAD);
  }, []);

  return {
    videos,
    loading: status === 'loading',
    status,
    error: status === 'error' ? (error as ServiceError | null) : null,
    refreshing,
    onRefresh,
    retry,
    stats,
    isCoach,
    navigateToVideo,
    navigateToUpload,
  } satisfies {
    videos: SessionVideo[];
    loading: boolean;
    status: ScreenStatus;
    error: ServiceError | null;
    refreshing: boolean;
    onRefresh: () => void;
    retry: () => void;
    stats: { totalVideos: number; totalViews: number; sharedCount: number };
    isCoach: boolean;
    navigateToVideo: (videoId: string) => void;
    navigateToUpload: () => void;
  };
}
