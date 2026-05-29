import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { Radii, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface CoverImageHeroProps {
  imageUrl?: string;
  sessionType?: string;
  height?: number;
}

function getSessionIcon(sessionType?: string): keyof typeof Ionicons.glyphMap {
  const type = sessionType?.toLowerCase() ?? '';
  if (type.includes('goal')) return 'football-outline';
  if (type.includes('group')) return 'people-outline';
  if (type.includes('assess')) return 'clipboard-outline';
  if (type.includes('clinic')) return 'medkit-outline';
  return 'football-outline';
}

function CoverImageHeroComponent({ imageUrl, sessionType, height = 180 }: CoverImageHeroProps) {
  const { colors: palette } = useTheme();

  if (imageUrl) {
    return (
      <View style={[styles.container, { height }]}>
        <Image source={{ uri: imageUrl }} style={[styles.image, { height }]} contentFit="cover" />
        {/* Bottom gradient overlay for text readability */}
        <View style={[styles.gradientOverlay, { backgroundColor: withAlpha(palette.text, 0.3) }]} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        styles.placeholder,
        { height, backgroundColor: withAlpha(palette.tint, 0.09) },
      ]}
    >
      <Ionicons name={getSessionIcon(sessionType)} size={48} color={withAlpha(palette.tint, 0.4)} />
    </View>
  );
}

export const CoverImageHero = CoverImageHeroComponent;

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderTopLeftRadius: Radii.lg,
    borderTopRightRadius: Radii.lg,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
