/**
 * CoachMarker Component
 *
 * Map marker displaying coach avatar and basic info.
 * Used in the MapView component for coach discovery.
 */

import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { CoachProfile } from '@/constants/types';

// Re-export extracted components for backward compat
export { ClusterMarker } from './coach-marker-sections';
export type { ClusterMarkerProps } from './coach-marker-sections';

interface CoachMarkerProps {
  coach: CoachProfile;
  isSelected?: boolean;
  onPress?: () => void;
  size?: 'small' | 'medium' | 'large';
  showPrice?: boolean;
  showRating?: boolean;
}

const SIZE_MAP = {
  small: { marker: 32, avatar: 24, font: 10 },
  medium: { marker: 44, avatar: 32, font: 12 },
  large: { marker: 56, avatar: 44, font: 14 },
};

export function CoachMarker({
  coach,
  isSelected = false,
  onPress,
  size = 'medium',
  showPrice = false,
  showRating = true,
}: CoachMarkerProps) {
  const { colors: palette } = useTheme();
  const scale = useSharedValue(1);
  const dimensions = SIZE_MAP[size];

  const handlePressIn = () => {
    scale.value = withSpring(1.15, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Coach ${coach.fullName}`}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={({ pressed }) => [styles.container, { opacity: pressed ? 0.9 : 1 }]}
      >
        <View
          style={[
            styles.marker,
            {
              width: dimensions.marker,
              height: dimensions.marker,
              borderRadius: dimensions.marker / 2,
              backgroundColor: isSelected ? palette.tint : palette.surface,
              borderColor: isSelected ? palette.tint : palette.border,
              shadowColor: palette.text,
            },
          ]}
        >
          <Image
            source={{ uri: coach.profilePhotoUrl }}
            style={[
              styles.avatar,
              {
                width: dimensions.avatar,
                height: dimensions.avatar,
                borderRadius: dimensions.avatar / 2,
                borderColor: isSelected ? palette.onPrimary : palette.border,
              },
            ]}
            contentFit="cover"
          />
        </View>

        <View style={[styles.pointer, { borderTopColor: isSelected ? palette.tint : palette.surface }]} />

        {showRating && (
          <View
            style={[
              styles.ratingBadge,
              {
                backgroundColor: isSelected ? palette.tint : palette.surface,
                borderColor: isSelected ? palette.tint : palette.border,
              },
            ]}
          >
            <Ionicons
              name="star"
              size={dimensions.font - 2}
              color={isSelected ? palette.onPrimary : palette.warning}
            />
            <ThemedText
              style={[
                styles.ratingText,
                {
                  fontSize: dimensions.font - 2,
                  color: isSelected ? palette.onPrimary : palette.text,
                },
              ]}
            >
              {coach.rating.average.toFixed(1)}
            </ThemedText>
          </View>
        )}

        {showPrice && (
          <View style={[styles.priceBadge, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <ThemedText style={[styles.priceText, { fontSize: dimensions.font, color: palette.text }]}>
              ${coach.priceRange.minUsd}
            </ThemedText>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  marker: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  avatar: {
    borderWidth: 2,
  },
  pointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -2,
  },
  ratingBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    alignItems: 'center',
    gap: Spacing.micro,
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  ratingText: {
    fontWeight: '700',
  },
  priceBadge: {
    position: 'absolute',
    bottom: 0,
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  priceText: {
    fontWeight: '700',
  },
});
