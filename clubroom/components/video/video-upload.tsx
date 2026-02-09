import { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
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
          Alert.alert('Video Too Long', `Maximum video duration is ${Math.floor(maxDurationSeconds / 60)} minutes.`);
          return;
        }

        if (fileSizeBytes > maxFileSizeMB * 1024 * 1024) {
          Alert.alert('File Too Large', `Maximum file size is ${maxFileSizeMB} MB.`);
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
      Alert.alert('Error', 'Failed to select video. Please try again.');
    }
  };

  const recordVideo = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Camera access is needed to record videos.');
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
      Alert.alert('Error', 'Failed to record video. Please try again.');
    }
  };

  const handleUpload = async () => {
    if (!selectedVideo) return;

    setUploading(true);
    setUploadProgress(0);

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        const next = prev + 10;
        progressWidth.value = withTiming(next, { duration: 200 });
        onProgress?.(next);
        if (next >= 100) {
          clearInterval(progressInterval);
        }
        return Math.min(next, 100);
      });
    }, 300);

    setTimeout(() => {
      clearInterval(progressInterval);
      setUploadProgress(100);
      progressWidth.value = withTiming(100, { duration: 200 });
      onUpload(selectedVideo);
      setUploading(false);
      setSelectedVideo(null);
      setUploadProgress(0);
      progressWidth.value = 0;
    }, 3000);
  };

  const clearSelection = () => {
    setSelectedVideo(null);
    setUploadProgress(0);
    progressWidth.value = 0;
  };

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
          palette={palette}
        />
      )}

      <RequirementsList maxDurationSeconds={maxDurationSeconds} maxFileSizeMB={maxFileSizeMB} palette={palette} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.lg,
  },
});
