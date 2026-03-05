import { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSharedValue, withTiming } from 'react-native-reanimated';

import { Spacing } from '@/constants/theme';
import { createLogger } from '@/utils/logger';
import { useTheme } from '@/hooks/useTheme';
import {
  VideoPickerCards,
  VideoPreviewCard,
  RequirementsList,
  type SelectedVideo,
} from './video-upload-sections';
import { uiFeedback } from '@/services/ui-feedback';

const logger = createLogger('VideoUpload');

interface VideoUploadProps {
  onUpload: (videoData: {
    uri: string;
    name: string;
    duration: number;
    fileSize: number;
    thumbnailUri?: string;
  }) => void;
  onProgress?: (progress: number) => void;
  maxDurationSeconds?: number;
  maxFileSizeMB?: number;
}

export function VideoUpload({
  onUpload,
  onProgress,
  maxDurationSeconds = 600,
  maxFileSizeMB = 500,
}: VideoUploadProps) {
  const { colors: palette } = useTheme();

  const [selectedVideo, setSelectedVideo] = useState<SelectedVideo | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const progressWidth = useSharedValue(0);

  const pickVideo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        quality: 1,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        const durationSecs = (asset.duration || 0) / 1000;
        const fileSizeBytes = asset.fileSize || 0;

        if (durationSecs > maxDurationSeconds) {
          uiFeedback.showToast(`Maximum video duration is ${Math.floor(maxDurationSeconds / 60)} minutes.`);
          return;
        }

        if (fileSizeBytes > maxFileSizeMB * 1024 * 1024) {
          uiFeedback.showToast(`Maximum file size is ${maxFileSizeMB} MB.`);
          return;
        }

        setSelectedVideo({
          uri: asset.uri,
          name: asset.fileName || `video_${Date.now()}.mp4`,
          duration: durationSecs,
          fileSize: fileSizeBytes,
          thumbnailUri: asset.uri,
        });
      }
    } catch (error) {
      logger.error('Failed to pick video', error);
      uiFeedback.showToast('Failed to select video. Please try again.', 'error');
    }
  };

  const recordVideo = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        uiFeedback.showToast('Camera access is needed to record videos.', 'error');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        quality: 0.8,
        videoMaxDuration: maxDurationSeconds,
      });

      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedVideo({
          uri: asset.uri,
          name: asset.fileName || `recording_${Date.now()}.mp4`,
          duration: (asset.duration || 0) / 1000,
          fileSize: asset.fileSize || 0,
          thumbnailUri: asset.uri,
        });
      }
    } catch (error) {
      logger.error('Failed to record video', error);
      uiFeedback.showToast('Failed to record video. Please try again.', 'error');
    }
  };

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleUpload = useCallback(async () => {
    if (!selectedVideo) return;

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setUploading(true);
    setUploadProgress(0);
    onProgress?.(0);

    try {
      const chunkSizeBytes = 1024 * 1024;
      const fileSizeBytes = Math.max(selectedVideo.fileSize || 0, chunkSizeBytes);
      const totalChunks = Math.max(1, Math.ceil(fileSizeBytes / chunkSizeBytes));

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
        if (signal.aborted) {
          throw new Error('UPLOAD_CANCELLED');
        }

        const delayMs = Math.max(
          60,
          Math.min(180, 90 + Math.round(fileSizeBytes / (20 * 1024 * 1024))),
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));

        if (signal.aborted) {
          throw new Error('UPLOAD_CANCELLED');
        }

        const next = Math.min(100, Math.round(((chunkIndex + 1) / totalChunks) * 100));
        setUploadProgress(next);
        progressWidth.value = withTiming(next, { duration: 120 });
        onProgress?.(next);
      }

      onUpload(selectedVideo);
      setSelectedVideo(null);
      setUploadProgress(0);
      progressWidth.value = 0;
      onProgress?.(0);
    } catch (error) {
      if (error instanceof Error && error.message === 'UPLOAD_CANCELLED') {
        uiFeedback.showToast('Video upload was cancelled.', 'success');
      } else {
        logger.error('Failed during upload simulation', error);
        uiFeedback.showToast('Failed to upload video. Please try again.', 'error');
      }
    } finally {
      abortControllerRef.current = null;
      setUploading(false);
    }
  }, [onProgress, onUpload, progressWidth, selectedVideo]);

  const cancelUpload = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const clearSelection = useCallback(() => {
    abortControllerRef.current?.abort();
    setSelectedVideo(null);
    setUploadProgress(0);
    progressWidth.value = 0;
    onProgress?.(0);
    setUploading(false);
  }, [onProgress, progressWidth]);

  return (
    <View style={styles.container}>
      {!selectedVideo ? (
        <VideoPickerCards onPickVideo={pickVideo} onRecordVideo={recordVideo} palette={palette} />
      ) : (
        <VideoPreviewCard
          video={selectedVideo}
          uploading={uploading}
          uploadProgress={uploadProgress}
          progressWidth={progressWidth}
          onClear={clearSelection}
          onUpload={handleUpload}
          onCancelUpload={uploading ? cancelUpload : undefined}
          palette={palette}
        />
      )}

      <RequirementsList
        maxDurationSeconds={maxDurationSeconds}
        maxFileSizeMB={maxFileSizeMB}
        palette={palette}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.lg,
  },
});
