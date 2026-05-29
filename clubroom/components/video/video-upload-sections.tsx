/**
 * Extracted sub-components for VideoUpload.
 *
 * VideoPickerCards — gallery/camera picker mode.
 * VideoPreviewCard — selected video preview with confirm/clear actions.
 * RequirementsList — file size/duration/format requirements.
 */

import React from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import { styles } from './video-upload-styles';
import { formatDuration, formatFileSize } from './video-upload-helpers';

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
  disabled?: boolean;
}

export const VideoPickerCards = function VideoPickerCards({
  onPickVideo,
  onRecordVideo,
  palette,
  disabled = false,
}: VideoPickerCardsProps) {
  return (
    <Row gap="md">
      <Clickable
        onPress={onPickVideo}
        disabled={disabled}
        accessibilityState={{ disabled }}
        style={[
          styles.pickerCard,
          { backgroundColor: palette.surface, borderColor: palette.border },
          disabled ? styles.disabled : undefined,
        ]}
      >
        <View style={[styles.pickerIcon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
          <Ionicons name="folder-open" size={32} color={palette.tint} />
        </View>
        <ThemedText type="defaultSemiBold">Choose Video</ThemedText>
        <ThemedText style={[styles.pickerHint, { color: palette.muted }]}>From gallery</ThemedText>
      </Clickable>

      <Clickable
        onPress={onRecordVideo}
        disabled={disabled}
        accessibilityState={{ disabled }}
        style={[
          styles.pickerCard,
          { backgroundColor: palette.surface, borderColor: palette.border },
          disabled ? styles.disabled : undefined,
        ]}
      >
        <View style={[styles.pickerIcon, { backgroundColor: withAlpha(palette.error, 0.09) }]}>
          <Ionicons name="videocam" size={32} color={palette.error} />
        </View>
        <ThemedText type="defaultSemiBold">Record Video</ThemedText>
        <ThemedText style={[styles.pickerHint, { color: palette.muted }]}>Use camera</ThemedText>
      </Clickable>
    </Row>
  );
};

// ─── VideoPreviewCard ───────────────────────────────────────────────────────

interface VideoPreviewCardProps {
  video: SelectedVideo;
  onClear: () => void;
  onSelectVideo: () => void;
  palette: ThemeColors;
  disabled?: boolean;
}

const renderVideoPreviewCard = function renderVideoPreviewCard({
  video,
  onClear,
  onSelectVideo,
  palette,
  disabled = false,
}: VideoPreviewCardProps) {
  return (
    <Animated.View entering={FadeIn.duration(200)}>
      <SurfaceCard style={styles.previewCard}>
        {/* Video Preview */}
        <View style={styles.previewContainer}>
          {video.thumbnailUri && (
            <Image
              source={{ uri: video.thumbnailUri }}
              style={styles.previewImage}
              contentFit="cover"
            />
          )}
          <View style={[styles.playOverlay, { backgroundColor: withAlpha(palette.text, 0.3) }]}>
            <Ionicons name="play-circle" size={48} color={palette.onPrimary} />
          </View>

          <Clickable
            accessibilityLabel="Close"
            onPress={onClear}
            disabled={disabled}
            style={[styles.clearButton, { backgroundColor: withAlpha(palette.text, 0.5) }]}
          >
            <Ionicons name="close" size={20} color={palette.onPrimary} />
          </Clickable>
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

        <Clickable
          onPress={onSelectVideo}
          disabled={disabled}
          accessibilityState={{ disabled }}
          style={[
            styles.selectButton,
            { backgroundColor: disabled ? palette.border : palette.tint },
          ]}
          accessibilityLabel="Use selected video"
        >
          <Ionicons name="checkmark-circle" size={20} color={palette.onPrimary} />
          <ThemedText style={{ color: palette.onPrimary, fontWeight: '700' }}>Use Video</ThemedText>
        </Clickable>
      </SurfaceCard>
    </Animated.View>
  );
};
export const VideoPreviewCard = renderVideoPreviewCard;

// ─── RequirementsList ───────────────────────────────────────────────────────

interface RequirementsListProps {
  maxDurationSeconds: number;
  maxFileSizeMB: number;
  palette: ThemeColors;
}

const renderRequirementsList = function renderRequirementsList({
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
      <ThemedText style={[styles.requirementsTitle, { color: palette.muted }]}>
        Requirements
      </ThemedText>
      <View style={styles.requirementsList}>
        {items.map((text) => (
          <Row key={text} align="center" gap="xs">
            <Ionicons name="checkmark-circle" size={14} color={palette.success} />
            <ThemedText style={[styles.requirementText, { color: palette.muted }]}>
              {text}
            </ThemedText>
          </Row>
        ))}
      </View>
    </View>
  );
};
export const RequirementsList = renderRequirementsList;

// style additions live in shared styles file
