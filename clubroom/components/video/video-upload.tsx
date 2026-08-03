import { useState } from 'react';
import { Linking, View, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { Spacing } from '@/constants/theme';
import { createLogger } from '@/utils/logger';
import { useTheme } from '@/hooks/useTheme';
import { StatusBanner } from '@/components/ui/primitives/StatusBanner';
import {
  VideoPickerCards,
  VideoPreviewCard,
  RequirementsList,
  type SelectedVideo,
} from './video-upload-sections';
import { uiFeedback } from '@/services/ui-feedback';

const logger = createLogger('VideoUpload');
const SUPPORTED_VIDEO_EXTENSIONS = new Set(['mp4', 'mov', 'm4v']);

interface VideoUploadProps {
  onSelect: (videoData: {
    uri: string;
    name: string;
    duration: number;
    fileSize: number;
    thumbnailUri?: string;
  }) => void;
  disabled?: boolean;
  maxDurationSeconds?: number;
  maxFileSizeMB?: number;
}

function isSupportedVideoFile(value: string): boolean {
  const filename = value.split(/[?#]/, 1)[0] ?? '';
  const extension = filename.split('.').pop()?.toLowerCase();
  return Boolean(extension && SUPPORTED_VIDEO_EXTENSIONS.has(extension));
}

export function VideoUpload({
  onSelect,
  disabled = false,
  maxDurationSeconds = 600,
  maxFileSizeMB = 500,
}: VideoUploadProps) {
  const { colors: palette } = useTheme();

  const [selectedVideo, setSelectedVideo] = useState<SelectedVideo | null>(null);
  const [permissionMessage, setPermissionMessage] = useState<string | null>(null);

  const pickVideo = async () => {
    if (disabled) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        quality: 1,
        allowsEditing: false,
      });
      setPermissionMessage(null);

      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        const fileName = asset.fileName || asset.uri;
        const durationSecs = (asset.duration || 0) / 1000;
        const fileSizeBytes = asset.fileSize || 0;

        if (!isSupportedVideoFile(fileName)) {
          uiFeedback.showToast('Choose an MP4, MOV, or M4V video.', 'error');
          return;
        }

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
    if (disabled) return;
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setPermissionMessage(
          'Camera access is needed to record videos. Enable it in Settings to continue.',
        );
        uiFeedback.showToast('Camera access is needed to record videos.', 'error');
        return;
      }
      setPermissionMessage(null);

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        quality: 0.8,
        videoMaxDuration: maxDurationSeconds,
      });

      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        const fileName = asset.fileName || asset.uri;

        if (!isSupportedVideoFile(fileName)) {
          uiFeedback.showToast('Choose an MP4, MOV, or M4V video.', 'error');
          return;
        }

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

  const handleSelectVideo = async () => {
    if (!selectedVideo) return;
    onSelect(selectedVideo);
    setSelectedVideo(null);
  };

  const clearSelection = () => {
    setSelectedVideo(null);
  };

  return (
    <View style={styles.container}>
      {!selectedVideo ? (
        <VideoPickerCards
          onPickVideo={pickVideo}
          onRecordVideo={recordVideo}
          palette={palette}
          disabled={disabled}
        />
      ) : (
          <VideoPreviewCard
            video={selectedVideo}
            onClear={clearSelection}
            onSelectVideo={handleSelectVideo}
            palette={palette}
            disabled={disabled}
          />
      )}
      {permissionMessage ? (
        <StatusBanner
          variant="warning"
          message={permissionMessage}
          action={{
            label: 'Open Settings',
            onPress: () => {
              void Linking.openSettings();
            },
          }}
          onDismiss={() => setPermissionMessage(null)}
        />
      ) : null}

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
