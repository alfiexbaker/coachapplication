import { useState, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { useAuth } from '@/hooks/use-auth';
import { videoService } from '@/services/video-service';
import { createLogger } from '@/utils/logger';
import type { SessionVideo } from '@/constants/types';

const logger = createLogger('useVideosList');

export function useVideosList() {
  const { currentUser } = useAuth();
  const [videos, setVideos] = useState<SessionVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalVideos: 0, totalViews: 0, sharedCount: 0 });

  const isCoach = currentUser?.role === 'COACH';

  const loadVideos = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const data = await videoService.getCoachVideos(currentUser.id);
      setVideos(data);
      const videoStats = await videoService.getCoachVideoStats(currentUser.id);
      setStats(videoStats);
    } catch (error) {
      logger.error('Failed to load videos:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => { loadVideos(); }, [loadVideos]);

  const navigateToVideo = useCallback((videoId: string) => {
    router.push(Routes.video(videoId));
  }, []);

  const navigateToUpload = useCallback(() => {
    router.push(Routes.VIDEOS_UPLOAD);
  }, []);

  return { videos, loading, stats, isCoach, navigateToVideo, navigateToUpload };
}
