import { useState } from 'react';

import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { useAuth } from '@/hooks/use-auth';
import { videoService, type VideoCreateStage } from '@/services/video-service';
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

export type VideoUploadStage = 'idle' | VideoCreateStage | 'failed';

const UPLOAD_STAGE_MESSAGES: Record<VideoUploadStage, string | null> = {
  idle: null,
  'initializing-upload': 'Preparing a private upload slot...',
  'uploading-file': 'Uploading video to private storage...',
  'finalizing-upload': 'Finalizing and scanning video...',
  'creating-record': 'Creating the video record...',
  ready: 'Video uploaded and ready.',
  failed: 'Upload failed. The video was not saved.',
};

const IN_PROGRESS_STAGES = new Set<VideoUploadStage>([
  'initializing-upload',
  'uploading-file',
  'finalizing-upload',
  'creating-record',
]);

export function useVideoUpload() {
  const { currentUser } = useAuth();
  const [videoData, setVideoData] = useState<VideoData>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [uploadStage, setUploadStage] = useState<VideoUploadStage>('idle');

  const isUploading = IN_PROGRESS_STAGES.has(uploadStage);

  const handleVideoSelected = (data: VideoData) => {
    setVideoData(data);
    setUploadStage('idle');
  };

  const clearSelectedVideo = () => {
    setVideoData(null);
    setUploadStage('idle');
  };

  const handleSubmit = async () => {
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

    setUploadStage('initializing-upload');
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
        {
          onStageChange: setUploadStage,
        },
      );
      logger.info('Video uploaded successfully', { videoId: newVideo.id });
      uiFeedback.showToast('Video uploaded successfully!', 'success');
      router.replace(Routes.video(newVideo.id));
    } catch (error) {
      logger.error('Failed to upload video', error);
      setUploadStage('failed');
      uiFeedback.showToast('There was an error uploading your video. Please try again.', 'error');
    }
  };

  const canSubmit = !!videoData && !!title.trim() && !isUploading;
  const uploadStatusMessage = UPLOAD_STAGE_MESSAGES[uploadStage];

  return {
    videoData,
    title,
    description,
    uploadStage,
    uploadStatusMessage,
    uploading: isUploading,
    isUploading,
    canSubmit,
    setTitle,
    setDescription,
    clearSelectedVideo,
    handleVideoSelected,
    handleSubmit,
  };
}
