import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';

import { mediaService } from '@/services/media-service';
import { createLogger } from '@/utils/logger';
import type { PhotoAsset, VideoAsset } from '@/types/progress-types';
import { uiFeedback } from '@/services/ui-feedback';

import { runAsyncTryCatchFinally } from '@/utils/async-control';

const logger = createLogger('UseSessionMedia');

const MAX_PHOTOS = 3;
const MAX_VIDEOS = 1;

interface UseSessionMediaParams {
  sessionId: string;
  athleteId: string;
  coachId: string;
}

type CaptureMode = 'photo' | 'video';

interface CapturedPhotoPayload {
  uri: string;
  width: number;
  height: number;
}

interface CapturedVideoPayload {
  uri: string;
  duration: number;
}

function inferExtension(uri: string, fallback: string): string {
  const clean = uri.split('?')[0] ?? uri;
  const extension = clean.split('.').pop();
  if (!extension || extension.length > 5) {
    return fallback;
  }
  return extension;
}

async function copyToDocumentDirectory(uri: string, prefix: string, extension: string): Promise<string> {
  const base = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
  if (!base) {
    return uri;
  }

  const folder = `${base}session-media`;
  await FileSystem.makeDirectoryAsync(folder, { intermediates: true });
  const target = `${folder}/${prefix}_${crypto.randomUUID()}.${extension}`;
  await FileSystem.copyAsync({ from: uri, to: target });
  return target;
}

async function processPhotoAsset(payload: CapturedPhotoPayload): Promise<PhotoAsset> {
  const optimized = await ImageManipulator.manipulateAsync(
    payload.uri,
    [{ resize: { width: 1080 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
  );
  const optimizedUri = await copyToDocumentDirectory(optimized.uri, 'photo', 'jpg');

  const thumb = await ImageManipulator.manipulateAsync(
    optimizedUri,
    [{ resize: { width: 200 } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
  );
  const thumbnailUri = await copyToDocumentDirectory(thumb.uri, 'thumb', 'jpg');

  return {
    uri: optimizedUri,
    thumbnailUri,
    width: optimized.width ?? payload.width,
    height: optimized.height ?? payload.height,
    capturedAt: new Date().toISOString(),
  };
}

async function processVideoAsset(payload: CapturedVideoPayload): Promise<VideoAsset> {
  const extension = inferExtension(payload.uri, 'mp4');
  const videoUri = await copyToDocumentDirectory(payload.uri, 'video', extension);
  const thumbnail = await VideoThumbnails.getThumbnailAsync(videoUri, { time: 0 });
  const thumbnailUri = await copyToDocumentDirectory(thumbnail.uri, 'video-thumb', 'jpg');

  return {
    uri: videoUri,
    thumbnailUri,
    duration: Math.max(0, Math.round(payload.duration)),
    capturedAt: new Date().toISOString(),
  };
}

export function useSessionMedia({ sessionId, athleteId, coachId }: UseSessionMediaParams) {
  const [photos, setPhotos] = useState<PhotoAsset[]>([]);
  const [video, setVideo] = useState<VideoAsset | null>(null);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [cameraMode, setCameraMode] = useState<CaptureMode>('photo');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(10);
  const isUploadingPhotosRef = useRef(false);

  const mediaIds = (() => {
    const photoUris = photos.map((photo) => photo.uri);
    return video ? [...photoUris, video.uri] : photoUris;
  })();

  const persistMedia = async (nextPhotos: PhotoAsset[], nextVideo: VideoAsset | null) => {
    const saveResult = await mediaService.saveSessionMedia({
      sessionId,
      athleteId,
      coachId,
      photos: nextPhotos,
      video: nextVideo,
      createdAt: new Date().toISOString(),
    });

    if (!saveResult.success) {
      logger.error('Failed to persist session media', saveResult.error);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadExisting = async () => {
      const result = await mediaService.getSessionMedia(sessionId, athleteId);
      if (!result.success || !result.data || !isMounted) {
        return;
      }

      setPhotos(result.data.photos);
      setVideo(result.data.video);
    };

    if (sessionId && athleteId) {
      void loadExisting();
    }

    return () => {
      isMounted = false;
    };
  }, [athleteId, sessionId]);

  const closeCamera = () => {
    setCameraVisible(false);
    setIsRecording(false);
    setRecordingSeconds(10);
  };

  const takePhoto = async () => {
    if (isUploadingPhotosRef.current) return;
    if (photos.length >= MAX_PHOTOS) {
      uiFeedback.showToast('Maximum 3 photos per session.');
      return;
    }

    if (Platform.OS === 'web') {
      isUploadingPhotosRef.current = true;
      await runAsyncTryCatchFinally(async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsMultipleSelection: false,
          quality: 0.8,
        });
        if (result.canceled || !result.assets[0]) {
          return;
        }

        const photoAsset = await processPhotoAsset({
          uri: result.assets[0].uri,
          width: result.assets[0].width ?? 0,
          height: result.assets[0].height ?? 0,
        });
        const nextPhotos = [...photos, photoAsset];
        setPhotos(nextPhotos);
        await persistMedia(nextPhotos, video);
      }, async (error) => {
        logger.error('Failed to select photo from library', error);
        uiFeedback.showToast('Unable to save photo. Please try again.', 'error');
      }, () => {
        isUploadingPhotosRef.current = false;
      });
      return;
    }

    setCameraMode('photo');
    setCameraVisible(true);
  };

  const recordVideo = async () => {
    if (video && MAX_VIDEOS === 1) {
      uiFeedback.showToast('Maximum 1 video per session.');
      return;
    }

    if (Platform.OS === 'web') {
      uiFeedback.showToast('Video recording is available on mobile devices.');
      return;
    }

    setCameraMode('video');
    setCameraVisible(true);
  };

  const handlePhotoCaptured = async (payload: CapturedPhotoPayload) => {
    if (isUploadingPhotosRef.current) {
      closeCamera();
      return;
    }
    isUploadingPhotosRef.current = true;

    return await runAsyncTryCatchFinally(async () => {
      if (photos.length >= MAX_PHOTOS) {
        uiFeedback.showToast('Maximum 3 photos per session.');
        return;
      }
      const photoAsset = await processPhotoAsset(payload);
      const nextPhotos = [...photos, photoAsset];
      if (nextPhotos.length > MAX_PHOTOS) {
        uiFeedback.showToast('Maximum 3 photos per session.');
        return;
      }
      setPhotos(nextPhotos);
      await persistMedia(nextPhotos, video);
    }, async error => {
      logger.error('Failed to process captured photo', error);
      uiFeedback.showToast('Unable to save photo. Please try again.', 'error');
    }, () => {
      isUploadingPhotosRef.current = false;
      closeCamera();
    });
  };

  const handleVideoCaptured = async (payload: CapturedVideoPayload) => {
    await runAsyncTryCatchFinally(async () => {
      const videoAsset = await processVideoAsset(payload);
      setVideo(videoAsset);
      await persistMedia(photos, videoAsset);
    }, async error => {
      logger.error('Failed to process captured video', error);
      uiFeedback.showToast('Unable to save video. Please try again.', 'error');
    }, () => {
      closeCamera();
    });
  };

  const removeMedia = async (uri: string) => {
    const result = await mediaService.removeSessionMediaAsset(sessionId, athleteId, uri);
    if (!result.success) {
      logger.error('Failed to remove media', result.error);
      return;
    }

    if (!result.data) {
      setPhotos([]);
      setVideo(null);
      return;
    }

    setPhotos(result.data.photos);
    setVideo(result.data.video);
  };

  return {
    photos,
    video,
    mediaIds,
    cameraVisible,
    cameraMode,
    isRecording,
    recordingSeconds,
    canTakePhoto: photos.length < MAX_PHOTOS,
    canRecordVideo: video === null || MAX_VIDEOS > 1,
    takePhoto,
    recordVideo,
    removeMedia,
    closeCamera,
    handlePhotoCaptured,
    handleVideoCaptured,
    setIsRecording,
    setRecordingSeconds,
  } as const;
}
