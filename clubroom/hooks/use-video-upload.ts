import { useState, useCallback } from 'react';

import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { useAuth } from '@/hooks/use-auth';
import { videoService } from '@/services/video-service';
import { createLogger } from '@/utils/logger';
import { uiFeedback } from '@/services/ui-feedback';

const logger = createLogger('useVideoUpload');

export type VideoData = {
  uri: string;
  name: string;
  duration: number;
  fileSize: number;
  thumbnailUri?: string;
} | null;

export function useVideoUpload() {
  const { currentUser } = useAuth();
  const [videoData, setVideoData] = useState<VideoData>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleVideoSelected = useCallback((data: VideoData) => setVideoData(data), []);

  const handleSubmit = useCallback(async () => {
    if (!videoData) {
      uiFeedback.showToast('Please select a video to upload.');
      return;
    }
    if (!title.trim()) {
      uiFeedback.showToast('Please enter a title for your video.', 'error');
      return;
    }
    if (!currentUser) {
      uiFeedback.showToast('You must be logged in to upload videos.', 'error');
      return;
    }

    setUploading(true);
    try {
      const newVideo = await videoService.createVideo(
        {
          coachId: currentUser.id,
          coachName: currentUser.name || currentUser.fullName || 'Coach',
          athleteIds: [],
          athleteNames: [],
          title: title.trim(),
          description: description.trim(),
        },
        videoData.uri,
        videoData.thumbnailUri || videoData.uri,
        videoData.duration,
        videoData.fileSize,
      );
      logger.info('Video uploaded successfully', { videoId: newVideo.id });
      uiFeedback.showToast('Video uploaded successfully!', 'success');
      router.replace(Routes.video(newVideo.id));
    } catch (error) {
      logger.error('Failed to upload video', error);
      uiFeedback.showToast('There was an error uploading your video. Please try again.', 'error');
    } finally {
      setUploading(false);
    }
  }, [videoData, title, description, currentUser]);

  const canSubmit = !!videoData && !!title.trim() && !uploading;

  return {
    videoData,
    title,
    description,
    uploading,
    canSubmit,
    setTitle,
    setDescription,
    handleVideoSelected,
    handleSubmit,
  };
}
