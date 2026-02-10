/**
 * Extracted sub-components for VideoUpload.
 *
 * VideoPickerCards — gallery/camera picker mode.
 * VideoPreviewCard — selected video preview with upload progress.
 * RequirementsList — file size/duration/format requirements.
 */

import React, { memo } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';

// ─── Helpers ────────────────────────────────────────────────────────────────

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SelectedVideo {
  uri: string;
  name: string;
  duration: number;
  fileSize: number;
  thumbnailUri?: string;
}

// ─── VideoPickerCards ───────────────────────────────────────────────────────

interface VideoPickerCardsProps {
  onPickVideo: () => void;
  onRecordVideo: () => void;
  palette: ThemeColors;
}

export const VideoPickerCards = memo(function VideoPickerCards({
  onPickVideo,
  onRecordVideo,
  palette,
}: VideoPickerCardsProps) {
  return (
    <Row gap="md">
      <Clickable
        onPress={onPickVideo}
        style={[styles.pickerCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
      >
        <View style={[styles.pickerIcon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
          <Ionicons name="folder-open" size={32} color={palette.tint} />
        </View>
        <ThemedText type="defaultSemiBold">Choose Video</ThemedText>
        <ThemedText style={[styles.pickerHint, { color: palette.muted }]}>From gallery</ThemedText>
      </Clickable>

      <Clickable
        onPress={onRecordVideo}
        style={[styles.pickerCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
      >
        <View style={[styles.pickerIcon, { backgroundColor: withAlpha(palette.error, 0.09) }]}>
          <Ionicons name="videocam" size={32} color={palette.error} />
        </View>
        <ThemedText type="defaultSemiBold">Record Video</ThemedText>
        <ThemedText style={[styles.pickerHint, { color: palette.muted }]}>Use camera</ThemedText>
      </Clickable>
    </Row>
  );
});

// ─── VideoPreviewCard ───────────────────────────────────────────────────────

interface VideoPreviewCardProps {
  video: SelectedVideo;
  uploading: boolean;
  uploadProgress: number;
  progressWidth: SharedValue<number>;
  onClear: () => void;
  onUpload: () => void;
  palette: ThemeColors;
}

export const VideoPreviewCard = memo(function VideoPreviewCard({
  video,
  uploading,
  uploadProgress,
  progressWidth,
  onClear,
  onUpload,
  palette,
}: VideoPreviewCardProps) {
  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));
  return (
    <Animated.View entering={FadeIn.duration(200)}>
      <SurfaceCard style={styles.previewCard}>
        {/* Video Preview */}
        <View style={styles.previewContainer}>
          {video.thumbnailUri && (
            <Image source={{ uri: video.thumbnailUri }} style={styles.previewImage} resizeMode="cover" />
          )}
          <View style={styles.playOverlay}>
            <Ionicons name="play-circle" size={48} color={palette.onPrimary} />
          </View>

          {!uploading && (
            <Clickable accessibilityLabel="Close" onPress={onClear} style={styles.clearButton}>
              <Ionicons name="close" size={20} color={palette.onPrimary} />
            </Clickable>
          )}
        </View>

        {/* Video Info */}
        <View style={styles.videoInfo}>
          <ThemedText type="defaultSemiBold" numberOfLines={1}>
            {video.name}
          </ThemedText>
          <Row gap="md">
            <Row align="center" gap="xxs">
              <Ionicons name="time-outline" size={14} color={palette.muted} />
              <ThemedText style={[styles.metaText, { color: palette.muted }]}>
                {formatDuration(video.duration)}
              </ThemedText>
            </Row>
            <Row align="center" gap="xxs">
              <Ionicons name="document-outline" size={14} color={palette.muted} />
              <ThemedText style={[styles.metaText, { color: palette.muted }]}>
                {formatFileSize(video.fileSize)}
              </ThemedText>
            </Row>
          </Row>
        </View>

        {/* Upload Progress */}
        {uploading && (
          <View style={styles.progressSection}>
            <View style={[styles.progressBar, { backgroundColor: palette.border }]}>
              <Animated.View style={[styles.progressFill, { backgroundColor: palette.tint }, progressStyle]} />
            </View>
            <ThemedText style={[styles.progressText, { color: palette.muted }]}>
              Uploading... {uploadProgress}%
            </ThemedText>
          </View>
        )}

        {/* Upload Button */}
        {!uploading && (
          <Clickable onPress={onUpload} style={[styles.uploadButton, { backgroundColor: palette.tint }]}>
            <Ionicons name="cloud-upload" size={20} color={palette.onPrimary} />
            <ThemedText style={{ color: palette.onPrimary, fontWeight: '700' }}>Upload Video</ThemedText>
          </Clickable>
        )}
      </SurfaceCard>
    </Animated.View>
  );
});

// ─── RequirementsList ───────────────────────────────────────────────────────

interface RequirementsListProps {
  maxDurationSeconds: number;
  maxFileSizeMB: number;
  palette: ThemeColors;
}

export const RequirementsList = memo(function RequirementsList({
  maxDurationSeconds,
  maxFileSizeMB,
  palette,
}: RequirementsListProps) {
  const items = [
    `Max duration: ${Math.floor(maxDurationSeconds / 60)} minutes`,
    `Max file size: ${maxFileSizeMB} MB`,
    'Formats: MP4, MOV, AVI',
  ];

  return (
    <View style={styles.requirements}>
      <ThemedText style={[styles.requirementsTitle, { color: palette.muted }]}>Requirements</ThemedText>
      <View style={styles.requirementsList}>
        {items.map((text) => (
          <Row key={text} align="center" gap="xs">
            <Ionicons name="checkmark-circle" size={14} color={palette.success} />
            <ThemedText style={[styles.requirementText, { color: palette.muted }]}>{text}</ThemedText>
          </Row>
        ))}
      </View>
    </View>
  );
});

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
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
    borderRadius: Radii['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  pickerHint: { ...Typography.caption },
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
    borderRadius: Radii.lg,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoInfo: {
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  metaText: { ...Typography.caption },
  progressSection: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.xs,
  },
  progressBar: {
    height: 6,
    borderRadius: Radii.xs,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radii.xs,
  },
  progressText: { ...Typography.caption, textAlign: 'center' },
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
  requirementsTitle: { ...Typography.caption, textTransform: 'uppercase', letterSpacing: 0.5 },
  requirementsList: {
    gap: Spacing.xs,
  },
  requirementText: { ...Typography.small },
});
