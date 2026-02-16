/**
 * VideoPlayer — Placeholder (expo-video removed).
 *
 * expo-video causes SIGABRT on iOS simulator with Expo 54.
 * This placeholder renders a "video unavailable" state.
 */

import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { withAlpha } from '@/constants/theme';
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

export function VideoPlayer({ height = 240 }: VideoPlayerProps) {
  const { colors: palette } = useTheme();

  return (
    <View
      style={[
        styles.container,
        { height, backgroundColor: withAlpha(palette.text, 0.05), justifyContent: 'center', alignItems: 'center' },
      ]}
    >
      <Ionicons name="videocam-off-outline" size={36} color={palette.muted} />
      <ThemedText style={{ color: palette.muted, marginTop: 8 }}>
        Video playback unavailable
      </ThemedText>
    </View>
  );
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
      style={[
        styles.container,
        { height, backgroundColor: withAlpha(palette.text, 0.05), justifyContent: 'center', alignItems: 'center' },
      ]}
    >
      <Ionicons name="videocam-off-outline" size={36} color={palette.muted} />
      <ThemedText style={{ color: palette.muted, marginTop: 8 }}>
        {message}
      </ThemedText>
    </View>
  );
}
