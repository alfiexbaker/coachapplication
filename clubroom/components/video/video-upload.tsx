import { useState } from 'react';
import { View, StyleSheet, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { createLogger } from '@/utils/logger';

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
  maxDurationSeconds = 600, // 10 minutes
  maxFileSizeMB = 500, // 500 MB
}: VideoUploadProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [selectedVideo, setSelectedVideo] = useState<{
    uri: string;
    name: string;
    duration: number;
    fileSize: number;
    thumbnailUri?: string;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const progressWidth = useSharedValue(0);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

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

        // Check duration limit
        if (durationSecs > maxDurationSeconds) {
          Alert.alert(
            'Video Too Long',
            `Maximum video duration is ${Math.floor(maxDurationSeconds / 60)} minutes.`
          );
          return;
        }

        // Check file size limit
        if (fileSizeBytes > maxFileSizeMB * 1024 * 1024) {
          Alert.alert('File Too Large', `Maximum file size is ${maxFileSizeMB} MB.`);
          return;
        }

        setSelectedVideo({
          uri: asset.uri,
          name: asset.fileName || `video_${Date.now()}.mp4`,
          duration: durationSecs,
          fileSize: fileSizeBytes,
          thumbnailUri: asset.uri, // Use video uri as thumbnail for now
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

    // Simulate upload progress
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

    // Wait for simulated upload
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

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  return (
    <View style={styles.container}>
      {!selectedVideo ? (
        <View style={styles.pickersRow}>
          <Clickable
            onPress={pickVideo}
            style={[styles.pickerCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
          >
            <View style={[styles.pickerIcon, { backgroundColor: `${palette.tint}15` }]}>
              <Ionicons name="folder-open" size={32} color={palette.tint} />
            </View>
            <ThemedText type="defaultSemiBold">Choose Video</ThemedText>
            <ThemedText style={[styles.pickerHint, { color: palette.muted }]}>
              From gallery
            </ThemedText>
          </Clickable>

          <Clickable
            onPress={recordVideo}
            style={[styles.pickerCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
          >
            <View style={[styles.pickerIcon, { backgroundColor: '#E91E6315' }]}>
              <Ionicons name="videocam" size={32} color="#E91E63" />
            </View>
            <ThemedText type="defaultSemiBold">Record Video</ThemedText>
            <ThemedText style={[styles.pickerHint, { color: palette.muted }]}>
              Use camera
            </ThemedText>
          </Clickable>
        </View>
      ) : (
        <Animated.View entering={FadeIn.duration(200)}>
          <SurfaceCard style={styles.previewCard}>
            {/* Video Preview */}
            <View style={styles.previewContainer}>
              {selectedVideo.thumbnailUri && (
                <Image
                  source={{ uri: selectedVideo.thumbnailUri }}
                  style={styles.previewImage}
                  resizeMode="cover"
                />
              )}
              <View style={styles.playOverlay}>
                <Ionicons name="play-circle" size={48} color="#fff" />
              </View>

              {!uploading && (
                <Clickable onPress={clearSelection} style={styles.clearButton}>
                  <Ionicons name="close" size={20} color="#fff" />
                </Clickable>
              )}
            </View>

            {/* Video Info */}
            <View style={styles.videoInfo}>
              <ThemedText type="defaultSemiBold" numberOfLines={1}>
                {selectedVideo.name}
              </ThemedText>
              <View style={styles.videoMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={14} color={palette.muted} />
                  <ThemedText style={[styles.metaText, { color: palette.muted }]}>
                    {formatDuration(selectedVideo.duration)}
                  </ThemedText>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="document-outline" size={14} color={palette.muted} />
                  <ThemedText style={[styles.metaText, { color: palette.muted }]}>
                    {formatFileSize(selectedVideo.fileSize)}
                  </ThemedText>
                </View>
              </View>
            </View>

            {/* Upload Progress */}
            {uploading && (
              <View style={styles.progressSection}>
                <View style={[styles.progressBar, { backgroundColor: palette.border }]}>
                  <Animated.View
                    style={[styles.progressFill, { backgroundColor: palette.tint }, progressStyle]}
                  />
                </View>
                <ThemedText style={[styles.progressText, { color: palette.muted }]}>
                  Uploading... {uploadProgress}%
                </ThemedText>
              </View>
            )}

            {/* Upload Button */}
            {!uploading && (
              <Clickable
                onPress={handleUpload}
                style={[styles.uploadButton, { backgroundColor: palette.tint }]}
              >
                <Ionicons name="cloud-upload" size={20} color="#fff" />
                <ThemedText style={{ color: '#fff', fontWeight: '700' }}>
                  Upload Video
                </ThemedText>
              </Clickable>
            )}
          </SurfaceCard>
        </Animated.View>
      )}

      {/* File Requirements */}
      <View style={styles.requirements}>
        <ThemedText style={[styles.requirementsTitle, { color: palette.muted }]}>
          Requirements
        </ThemedText>
        <View style={styles.requirementsList}>
          <View style={styles.requirementItem}>
            <Ionicons name="checkmark-circle" size={14} color={palette.success} />
            <ThemedText style={[styles.requirementText, { color: palette.muted }]}>
              Max duration: {Math.floor(maxDurationSeconds / 60)} minutes
            </ThemedText>
          </View>
          <View style={styles.requirementItem}>
            <Ionicons name="checkmark-circle" size={14} color={palette.success} />
            <ThemedText style={[styles.requirementText, { color: palette.muted }]}>
              Max file size: {maxFileSizeMB} MB
            </ThemedText>
          </View>
          <View style={styles.requirementItem}>
            <Ionicons name="checkmark-circle" size={14} color={palette.success} />
            <ThemedText style={[styles.requirementText, { color: palette.muted }]}>
              Formats: MP4, MOV, AVI
            </ThemedText>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.lg,
  },
  pickersRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  pickerCard: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.xl,
    borderRadius: Radii.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    gap: Spacing.sm,
  },
  pickerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  pickerHint: {
    fontSize: 12,
  },
  previewCard: {
    padding: 0,
    overflow: 'hidden',
  },
  previewContainer: {
    position: 'relative',
    height: 180,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButton: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoInfo: {
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  videoMeta: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
  },
  progressSection: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.xs,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    textAlign: 'center',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    margin: Spacing.md,
    marginTop: 0,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
  },
  requirements: {
    gap: Spacing.sm,
  },
  requirementsTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  requirementsList: {
    gap: Spacing.xs,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  requirementText: {
    fontSize: 13,
  },
});
