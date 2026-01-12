/**
 * Video Upload Screen
 *
 * Allows coaches to upload training session videos.
 * Videos can be tagged with athletes, sessions, and visibility settings.
 */

import { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { VideoUpload } from '@/components/video/video-upload';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { createLogger } from '@/utils/logger';
import { videoService } from '@/services/video-service';
import type { VideoVisibility } from '@/constants/types';

const logger = createLogger('VideoUploadScreen');

const VISIBILITY_OPTIONS: { value: VideoVisibility; label: string; description: string; icon: string }[] = [
  { value: 'PRIVATE', label: 'Private', description: 'Only visible to you', icon: 'lock-closed' },
  { value: 'SHARED', label: 'Shared', description: 'Visible to tagged athletes and parents', icon: 'people' },
  { value: 'PUBLIC', label: 'Public', description: 'Visible to all club members', icon: 'globe' },
];

export default function VideoUploadScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [videoData, setVideoData] = useState<{
    uri: string;
    name: string;
    duration: number;
    fileSize: number;
    thumbnailUri?: string;
  } | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<VideoVisibility>('SHARED');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleVideoSelected = useCallback((data: typeof videoData) => {
    setVideoData(data);
  }, []);

  const handleUploadProgress = useCallback((progress: number) => {
    setUploadProgress(progress);
  }, []);

  const handleSubmit = async () => {
    if (!videoData) {
      Alert.alert('No Video', 'Please select a video to upload.');
      return;
    }

    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please enter a title for your video.');
      return;
    }

    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in to upload videos.');
      return;
    }

    setUploading(true);

    try {
      // Create the video record using the service
      const newVideo = await videoService.createVideo(
        {
          coachId: currentUser.id,
          coachName: currentUser.name || currentUser.fullName || 'Coach',
          athleteIds: [], // Can be enhanced to tag athletes
          athleteNames: [],
          title: title.trim(),
          description: description.trim(),
        },
        videoData.uri,
        videoData.thumbnailUri || videoData.uri,
        videoData.duration,
        videoData.fileSize
      );

      // Update visibility if not private (default)
      if (visibility !== 'PRIVATE') {
        if (visibility === 'PUBLIC') {
          // For public, we don't need to specify parent IDs
          await videoService.shareVideo(newVideo.id, []);
        }
      }

      logger.info('Video uploaded successfully', { videoId: newVideo.id });

      Alert.alert('Success', 'Video uploaded successfully!', [
        { text: 'View Video', onPress: () => router.replace(`/videos/${newVideo.id}`) },
        { text: 'Upload Another', onPress: () => {
          setVideoData(null);
          setTitle('');
          setDescription('');
          setUploadProgress(0);
        }},
      ]);
    } catch (error) {
      logger.error('Failed to upload video', error);
      Alert.alert('Upload Failed', 'There was an error uploading your video. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <Clickable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={palette.foreground} />
        </Clickable>
        <ThemedText type="subtitle">Upload Video</ThemedText>
        <Clickable
          onPress={handleSubmit}
          disabled={!videoData || !title.trim() || uploading}
          style={[
            styles.submitButton,
            { backgroundColor: videoData && title.trim() ? palette.tint : palette.border },
          ]}
        >
          <ThemedText
            style={styles.submitText}
            lightColor={videoData && title.trim() ? '#FFFFFF' : palette.muted}
            darkColor={videoData && title.trim() ? '#000000' : palette.muted}
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </ThemedText>
        </Clickable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Video Picker */}
        <SurfaceCard style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Select Video
          </ThemedText>
          <VideoUpload
            onUpload={handleVideoSelected}
            onProgress={handleUploadProgress}
            maxDurationSeconds={600}
            maxFileSizeMB={500}
          />
        </SurfaceCard>

        {/* Video Details */}
        <SurfaceCard style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Video Details
          </ThemedText>

          <View style={styles.fieldGroup}>
            <ThemedText style={styles.label}>Title *</ThemedText>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g., Tom's Dribbling Session - Week 4"
              placeholderTextColor={palette.muted}
              style={[styles.input, { borderColor: palette.border, backgroundColor: palette.card }]}
            />
          </View>

          <View style={styles.fieldGroup}>
            <ThemedText style={styles.label}>Description</ThemedText>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Add notes about what's covered in this video..."
              placeholderTextColor={palette.muted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={[styles.input, styles.textArea, { borderColor: palette.border, backgroundColor: palette.card }]}
            />
          </View>
        </SurfaceCard>

        {/* Visibility */}
        <SurfaceCard style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Visibility
          </ThemedText>

          <View style={styles.visibilityOptions}>
            {VISIBILITY_OPTIONS.map((option) => {
              const isSelected = visibility === option.value;
              return (
                <Clickable
                  key={option.value}
                  onPress={() => setVisibility(option.value)}
                  style={[
                    styles.visibilityOption,
                    {
                      borderColor: isSelected ? palette.tint : palette.border,
                      backgroundColor: isSelected ? `${palette.tint}15` : palette.card,
                    },
                  ]}
                >
                  <View style={styles.visibilityHeader}>
                    <Ionicons
                      name={option.icon as any}
                      size={20}
                      color={isSelected ? palette.tint : palette.muted}
                    />
                    <ThemedText
                      style={[styles.visibilityLabel, { color: isSelected ? palette.tint : palette.foreground }]}
                    >
                      {option.label}
                    </ThemedText>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color={palette.tint} />
                    )}
                  </View>
                  <ThemedText style={[styles.visibilityDescription, { color: palette.muted }]}>
                    {option.description}
                  </ThemedText>
                </Clickable>
              );
            })}
          </View>
        </SurfaceCard>

        {/* Upload Progress */}
        {uploading && (
          <SurfaceCard style={styles.section}>
            <View style={styles.progressContainer}>
              <ThemedText style={styles.progressText}>
                Uploading... {Math.round(uploadProgress * 100)}%
              </ThemedText>
              <View style={[styles.progressBar, { backgroundColor: palette.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    { backgroundColor: palette.tint, width: `${uploadProgress * 100}%` },
                  ]}
                />
              </View>
            </View>
          </SurfaceCard>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: Spacing.xs,
  },
  submitButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  submitText: {
    fontWeight: '600',
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  section: {
    gap: Spacing.md,
  },
  sectionTitle: {
    marginBottom: Spacing.xs,
  },
  fieldGroup: {
    gap: Spacing.xs,
  },
  label: {
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    paddingTop: Spacing.sm,
  },
  visibilityOptions: {
    gap: Spacing.sm,
  },
  visibilityOption: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  visibilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  visibilityLabel: {
    fontWeight: '600',
    flex: 1,
  },
  visibilityDescription: {
    fontSize: 13,
    marginLeft: 28,
  },
  progressContainer: {
    gap: Spacing.sm,
  },
  progressText: {
    textAlign: 'center',
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
});
