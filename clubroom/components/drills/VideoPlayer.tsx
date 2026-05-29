import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Spacing, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { styles } from './video-player-styles';

interface VideoPlayerProps {
  videoUrl: string;
  thumbnailUrl?: string;
  title?: string;
  duration?: number;
  autoPlay?: boolean;
  onComplete?: () => void;
  height?: number;
}

export function VideoPlayer({ videoUrl, title, height = 240 }: VideoPlayerProps) {
  if (!videoUrl?.trim()) {
    return <NoVideoPlaceholder message="No video available" height={height} />;
  }

  return <NoVideoPlaceholder message={title ?? 'Video playback unavailable'} height={height} />;
}

export function NoVideoPlaceholder({
  message = 'No video available',
  height = 200,
}: {
  message?: string;
  height?: number;
}) {
  const { colors: palette } = useTheme();
  return (
    <View
      style={[styles.noVideoContainer, { height, backgroundColor: withAlpha(palette.text, 0.05) }]}
    >
      <Ionicons name="videocam-off-outline" size={36} color={palette.muted} />
      <ThemedText style={{ color: palette.muted, marginTop: Spacing.xs }}>{message}</ThemedText>
    </View>
  );
}
