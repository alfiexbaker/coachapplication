import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { useAuth } from '@/hooks/use-auth';
import { videoService } from '@/services/video-service';
import { createLogger } from '@/utils/logger';
import type { VideoVisibility } from '@/constants/types';

const logger = createLogger('useVideoUpload');

export const VISIBILITY_OPTIONS: { value: VideoVisibility; label: string; description: string; icon: string }[] = [
  { value: 'PRIVATE', label: 'Private', description: 'Only visible to you', icon: 'lock-closed' },
  { value: 'SHARED', label: 'Shared', description: 'Visible to tagged athletes and parents', icon: 'people' },
  { value: 'PUBLIC', label: 'Public', description: 'Visible to all club members', icon: 'globe' },
];

export type VideoData = { uri: string; name: string; duration: number; fileSize: number; thumbnailUri?: string } | null;

export function useVideoUpload() {
  const { currentUser } = useAuth();
  const [videoData, setVideoData] = useState<VideoData>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<VideoVisibility>('SHARED');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleVideoSelected = useCallback((data: VideoData) => setVideoData(data), []);
  const handleUploadProgress = useCallback((progress: number) => setUploadProgress(progress), []);

  const handleSubmit = useCallback(async () => {
    if (!videoData) { Alert.alert('No Video', 'Please select a video to upload.'); return; }
    if (!title.trim()) { Alert.alert('Missing Title', 'Please enter a title for your video.'); return; }
    if (!currentUser) { Alert.alert('Error', 'You must be logged in to upload videos.'); return; }

    setUploading(true);
    try {
      const newVideo = await videoService.createVideo(
        { coachId: currentUser.id, coachName: currentUser.name || currentUser.fullName || 'Coach', athleteIds: [], athleteNames: [], title: title.trim(), description: description.trim() },
        videoData.uri, videoData.thumbnailUri || videoData.uri, videoData.duration, videoData.fileSize,
      );
      if (visibility !== 'PRIVATE' && visibility === 'PUBLIC') {
        await videoService.shareVideo(newVideo.id, []);
      }
      logger.info('Video uploaded successfully', { videoId: newVideo.id });
      Alert.alert('Success', 'Video uploaded successfully!', [
        { text: 'View Video', onPress: () => router.replace(Routes.video(newVideo.id)) },
        { text: 'Upload Another', onPress: () => { setVideoData(null); setTitle(''); setDescription(''); setUploadProgress(0); } },
      ]);
    } catch (error) {
      logger.error('Failed to upload video', error);
      Alert.alert('Upload Failed', 'There was an error uploading your video. Please try again.');
    } finally {
      setUploading(false);
    }
  }, [videoData, title, description, visibility, currentUser]);

  return {
    videoData, title, description, visibility, uploading, uploadProgress,
    setTitle, setDescription, setVisibility,
    handleVideoSelected, handleUploadProgress, handleSubmit,
  };
}
