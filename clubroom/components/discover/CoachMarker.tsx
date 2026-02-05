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
import { Colors, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { CoachProfile } from '@/constants/types';

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
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
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
        style={({ pressed }) => [
          styles.container,
          {
            opacity: pressed ? 0.9 : 1,
          },
        ]}
      >
        {/* Main Marker */}
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
                borderColor: isSelected ? '#fff' : palette.border,
              },
            ]}
            contentFit="cover"
          />
        </View>

        {/* Pointer */}
        <View
          style={[
            styles.pointer,
            {
              borderTopColor: isSelected ? palette.tint : palette.surface,
            },
          ]}
        />

        {/* Rating Badge */}
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
              color={isSelected ? '#fff' : '#FFA500'}
            />
            <ThemedText
              style={[
                styles.ratingText,
                {
                  fontSize: dimensions.font - 2,
                  color: isSelected ? '#fff' : palette.text,
                },
              ]}
            >
              {coach.rating.average.toFixed(1)}
            </ThemedText>
          </View>
        )}

        {/* Price Badge */}
        {showPrice && (
          <View
            style={[
              styles.priceBadge,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
              },
            ]}
          >
            <ThemedText
              style={[
                styles.priceText,
                { fontSize: dimensions.font, color: palette.text },
              ]}
            >
              ${coach.priceRange.minUsd}
            </ThemedText>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

/**
 * Cluster Marker Component
 *
 * Displayed when multiple coaches are grouped together.
 */
interface ClusterMarkerProps {
  count: number;
  onPress?: () => void;
}

export function ClusterMarker({ count, onPress }: ClusterMarkerProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${count} coaches in this area`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.cluster,
        {
          backgroundColor: palette.tint,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <ThemedText style={styles.clusterText} lightColor="#fff" darkColor="#fff">
        {count}
      </ThemedText>
    </Pressable>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  ratingText: {
    fontWeight: '700',
  },
  priceBadge: {
    position: 'absolute',
    bottom: 0,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  priceText: {
    fontWeight: '700',
  },
  cluster: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  clusterText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
