/**
 * CoachMarker (Price Pill) Component — Sprint 8C
 *
 * A map-style price pill pin for the simulated map view.
 * Shows price in a rounded pill, with selected and saved states.
 */

import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CoachMarkerPillProps {
  /** Price string, e.g. "£40/hr" */
  price: string;
  /** Whether this pin is currently selected */
  selected?: boolean;
  /** Whether the coach is saved/favourited */
  saved?: boolean;
  /** Press handler */
  onPress?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CoachMarkerPill({
  price,
  selected = false,
  saved = false,
  onPress,
}: CoachMarkerPillProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(1.1, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const pillBackground = selected ? palette.tint : palette.surface;
  const pillTextColor = selected ? palette.onPrimary : palette.text;
  const pillBorderColor = selected ? palette.tint : palette.border;

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Coach ${price}`}
        accessibilityState={{ selected }}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={({ pressed }) => [
          styles.pill,
          {
            backgroundColor: pillBackground,
            borderColor: pillBorderColor,
            opacity: pressed ? 0.9 : 1,
            shadowColor: palette.text,
          },
        ]}
      >
        <ThemedText
          style={[styles.priceText, { color: pillTextColor }]}
        >
          {price}
        </ThemedText>

        {/* Small heart indicator for saved coaches */}
        {saved && (
          <View
            style={[
              styles.savedBadge,
              { backgroundColor: selected ? palette.onPrimary : palette.error },
            ]}
          >
            <Ionicons
              name="heart"
              size={8}
              color={selected ? palette.error : palette.onPrimary}
            />
          </View>
        )}
      </Pressable>

      {/* Pointer triangle */}
      <View style={styles.pointerContainer}>
        <View
          style={[
            styles.pointer,
            { borderTopColor: pillBorderColor },
          ]}
        />
      </View>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1,
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    gap: Spacing.xs / 2,
  },
  priceText: {
    ...Typography.caption,
    fontWeight: '700',
  },
  savedBadge: {
    width: 14,
    height: 14,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointerContainer: {
    alignItems: 'center',
  },
  pointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
});
