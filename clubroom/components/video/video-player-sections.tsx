/**
 * Extracted sub-components for video-player.
 *
 * AnnotationTimeline — list of video annotations with seek-to-timestamp.
 * formatTime — shared time formatting helper.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { VideoAnnotation } from '@/constants/types';

// ─── Helpers ────────────────────────────────────────────────────────────────

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function getMarkerColor(type: VideoAnnotation['type'], palette: { success: string; warning: string; tint: string; muted: string }) {
  switch (type) {
    case 'HIGHLIGHT':
      return palette.success;
    case 'IMPROVEMENT':
      return palette.warning;
    case 'TECHNIQUE':
      return palette.tint;
    default:
      return palette.muted;
  }
}

// ─── AnnotationTimeline ─────────────────────────────────────────────────────

interface AnnotationTimelineProps {
  annotations: VideoAnnotation[];
  currentTime: number;
  duration: number;
  onSeek: (timestamp: number) => void;
}

export function AnnotationTimeline({
  annotations,
  currentTime,
  duration,
  onSeek,
}: AnnotationTimelineProps) {
  const { colors: palette } = useTheme();

  return (
    <View style={styles.timeline}>
      <ThemedText type="defaultSemiBold" style={styles.timelineTitle}>
        Annotations ({annotations.length})
      </ThemedText>

      {annotations.length === 0 ? (
        <ThemedText style={[styles.noAnnotations, { color: palette.muted }]}>
          No annotations yet
        </ThemedText>
      ) : (
        <View style={styles.annotationsList}>
          {annotations.map((annotation) => {
            const isActive = Math.abs(currentTime - annotation.timestamp) < 2;
            const markerColor = getMarkerColor(annotation.type, palette);

            return (
              <Clickable
                key={annotation.id}
                onPress={() => onSeek(annotation.timestamp)}
                style={[
                  styles.annotationItem,
                  {
                    backgroundColor: isActive ? withAlpha(markerColor, 0.15) : palette.surface,
                    borderColor: isActive ? markerColor : palette.border,
                  },
                ]}
              >
                <View style={[styles.annotationDot, { backgroundColor: markerColor }]} />
                <View style={styles.annotationContent}>
                  <View style={styles.annotationHeader}>
                    <ThemedText type="defaultSemiBold" style={styles.annotationLabel}>
                      {annotation.label}
                    </ThemedText>
                    <ThemedText style={[styles.annotationTime, { color: palette.muted }]}>
                      {formatTime(annotation.timestamp)}
                    </ThemedText>
                  </View>
                  {annotation.note && (
                    <ThemedText style={[styles.annotationNote, { color: palette.muted }]}>
                      {annotation.note}
                    </ThemedText>
                  )}
                </View>
              </Clickable>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  timeline: { gap: Spacing.md },
  timelineTitle: { marginBottom: Spacing.xs },
  noAnnotations: { textAlign: 'center', paddingVertical: Spacing.lg },
  annotationsList: { gap: Spacing.sm },
  annotationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.md,
  },
  annotationDot: { width: 10, height: 10, borderRadius: Radii.sm, marginTop: Spacing.xxs },
  annotationContent: { flex: 1, gap: Spacing.xxs },
  annotationHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  annotationLabel: { ...Typography.bodySmall },
  annotationTime: { ...Typography.caption },
  annotationNote: { ...Typography.small },
});
