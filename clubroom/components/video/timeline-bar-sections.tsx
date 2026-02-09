/**
 * Extracted sub-components for TimelineBar.
 *
 * formatTimestamp — time formatting helper.
 * TimelineLabels — current time + duration labels.
 * TimelineGroupedMarker — grouped annotation marker badge.
 * TimelineActiveIndicator — active annotation pill.
 * CompactTimelineInner — compact timeline variant (accepts palette).
 */

import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { CompactAnnotationMarker } from './AnnotationMarker';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { ANNOTATION_TYPE_CONFIG } from '@/services/video-service';
import type { VideoAnnotation } from '@/constants/types';
import type { ThemeColors } from '@/hooks/useTheme';

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ─── TimelineLabels ──────────────────────────────────────────────────────────

interface TimelineLabelsProps {
  currentTime: number;
  duration: number;
  palette: ThemeColors;
}

export const TimelineLabels = memo(function TimelineLabels({
  currentTime,
  duration,
  palette,
}: TimelineLabelsProps) {
  return (
    <View style={styles.labelsRow}>
      <ThemedText style={[styles.timeLabel, { color: palette.muted }]}>
        {formatTimestamp(currentTime)}
      </ThemedText>
      <ThemedText style={[styles.timeLabel, { color: palette.muted }]}>
        {formatTimestamp(duration)}
      </ThemedText>
    </View>
  );
});

// ─── TimelineGroupedMarker ───────────────────────────────────────────────────

interface TimelineGroupedMarkerProps {
  position: number;
  annotations: VideoAnnotation[];
  onAnnotationPress?: (annotation: VideoAnnotation) => void;
  palette: ThemeColors;
}

export const TimelineGroupedMarker = memo(function TimelineGroupedMarker({
  position,
  annotations,
  onAnnotationPress,
  palette,
}: TimelineGroupedMarkerProps) {
  return (
    <View style={[styles.groupedMarkers, { left: `${position}%` }]}>
      <View style={[styles.groupBadge, { backgroundColor: palette.tint }]}>
        <ThemedText style={[styles.groupCount, { color: palette.onPrimary }]}>
          {annotations.length}
        </ThemedText>
      </View>
      <View style={styles.groupStack}>
        {annotations.slice(0, 3).map((ann) => (
          <CompactAnnotationMarker
            key={ann.id}
            type={ann.type}
            onPress={() => onAnnotationPress?.(ann)}
          />
        ))}
      </View>
    </View>
  );
});

// ─── TimelineActiveIndicator ─────────────────────────────────────────────────

interface TimelineActiveIndicatorProps {
  annotation: VideoAnnotation;
  onPress: () => void;
  palette: ThemeColors;
}

export const TimelineActiveIndicator = memo(function TimelineActiveIndicator({
  annotation,
  onPress,
  palette,
}: TimelineActiveIndicatorProps) {
  return (
    <Clickable
      onPress={onPress}
      style={[
        styles.activeIndicator,
        { backgroundColor: ANNOTATION_TYPE_CONFIG[annotation.type].color },
      ]}
    >
      <Ionicons
        name={ANNOTATION_TYPE_CONFIG[annotation.type].icon as keyof typeof Ionicons.glyphMap}
        size={12}
        color={palette.onPrimary}
      />
      <ThemedText style={[styles.activeLabel, { color: palette.onPrimary }]} numberOfLines={1}>
        {annotation.label}
      </ThemedText>
    </Clickable>
  );
});

// ─── CompactTimelineInner ────────────────────────────────────────────────────

interface CompactTimelineInnerProps {
  duration: number;
  currentTime: number;
  annotations: VideoAnnotation[];
  palette: ThemeColors;
}

export const CompactTimelineInner = memo(function CompactTimelineInner({
  duration,
  currentTime,
  annotations,
  palette,
}: CompactTimelineInnerProps) {
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <View style={styles.compactContainer}>
      <View style={[styles.compactTrack, { backgroundColor: withAlpha(palette.muted, 0.19) }]}>
        <View
          style={[
            styles.compactProgress,
            { backgroundColor: palette.tint, width: `${progress}%` },
          ]}
        />
        {annotations.map((ann) => (
          <View
            key={ann.id}
            style={[
              styles.compactMarker,
              {
                left: `${(ann.timestamp / duration) * 100}%`,
                backgroundColor: ANNOTATION_TYPE_CONFIG[ann.type].color,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
});

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.micro,
  },
  timeLabel: { ...Typography.caption },
  groupedMarkers: {
    position: 'absolute',
    alignItems: 'center',
    top: -20,
  },
  groupBadge: {
    width: 18,
    height: 18,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.micro,
  },
  groupCount: { ...Typography.micro },
  groupStack: {
    flexDirection: 'row',
    gap: -6,
  },
  activeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
    gap: Spacing.xxs,
  },
  activeLabel: { ...Typography.caption, maxWidth: 150 },
  compactContainer: { height: 4 },
  compactTrack: {
    flex: 1,
    borderRadius: Radii.xs,
    position: 'relative',
    overflow: 'hidden',
  },
  compactProgress: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  compactMarker: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: Radii.xs,
    top: 0,
    marginLeft: -2,
  },
});
