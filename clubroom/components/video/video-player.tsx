/**
 * VideoPlayer — Placeholder (expo-video removed).
 *
 * expo-video causes SIGABRT on iOS simulator with Expo 54.
 * This placeholder renders a "video unavailable" state until
 * a stable video solution is integrated.
 */

import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { VideoAnnotation } from '@/constants/types';

// Re-export for backward compat
export { AnnotationTimeline } from './video-player-sections';

interface VideoPlayerProps {
  videoUrl: string;
  thumbnailUrl?: string;
  duration?: number;
  annotations?: VideoAnnotation[];
  onAnnotationPress?: (annotation: VideoAnnotation) => void;
  onTimeUpdate?: (currentTime: number) => void;
  initialPosition?: number;
  autoPlay?: boolean;
}

export function VideoPlayer(_props: VideoPlayerProps) {
  const { colors: palette } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: withAlpha(palette.text, 0.05) }]}>
      <Ionicons name="videocam-off-outline" size={40} color={palette.muted} />
      <ThemedText style={[styles.label, { color: palette.muted }]}>
        Video playback unavailable
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: Radii.lg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  label: {
    ...Typography.bodySmall,
  },
});
