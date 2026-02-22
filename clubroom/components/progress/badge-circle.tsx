import { memo, useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { CORNER_COLORS } from '@/constants/four-corner-mapping';
import { Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { AllBadgeWithProgress } from '@/services/badge-service';
import { HapticPatterns } from '@/utils/haptics';

interface BadgeCircleProps {
  badge: AllBadgeWithProgress;
  onPress: (badge: AllBadgeWithProgress) => void;
}

function categoryColor(category: AllBadgeWithProgress['category'], fallback: string): string {
  if (!category) {
    return fallback;
  }
  return CORNER_COLORS[category] ?? fallback;
}

export const BadgeCircle = memo(function BadgeCircle({ badge, onPress }: BadgeCircleProps) {
  const { colors } = useTheme();
  const unlocked = badge.isUnlocked;
  const accent = categoryColor(badge.category, colors.tint);
  const progress = Math.max(0, Math.min(100, Math.round(badge.progress)));
  const fillProgress = useSharedValue(unlocked ? 1 : 0);
  const iconReveal = useSharedValue(unlocked ? 1 : 0);
  const pulse = useSharedValue(0);
  const glow = useSharedValue(0);
  const previouslyUnlocked = useRef(unlocked);
  const lockedBackground = withAlpha(colors.border, 0.18);
  const unlockedBackground = withAlpha(accent, 0.16);
  const lockedBorder = withAlpha(colors.border, 0.7);
  const unlockedBorder = withAlpha(accent, 0.6);
  const handlePress = useCallback(() => {
    void HapticPatterns.tap();
    onPress(badge);
  }, [badge, onPress]);

  useEffect(() => {
    fillProgress.value = withTiming(unlocked ? 1 : 0, { duration: 260 });
    iconReveal.value = withTiming(unlocked ? 1 : 0, { duration: 220 });

    if (unlocked && !previouslyUnlocked.current) {
      pulse.value = withSequence(
        withTiming(1, { duration: 120 }),
        withTiming(0, { duration: 170 }),
      );
      glow.value = withSequence(
        withTiming(1, { duration: 280 }),
        withTiming(0, { duration: 300 }),
      );
      void HapticPatterns.success();
    }

    previouslyUnlocked.current = unlocked;
  }, [fillProgress, glow, iconReveal, pulse, unlocked]);

  const circleStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      fillProgress.value,
      [0, 1],
      [lockedBackground, unlockedBackground],
    ),
    borderColor: interpolateColor(
      fillProgress.value,
      [0, 1],
      [lockedBorder, unlockedBorder],
    ),
    opacity: unlocked ? 1 : 0.78,
    transform: [{ scale: 1 + pulse.value * 0.2 }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value * 0.6,
    transform: [{ scale: 1 + glow.value * 0.3 }],
  }));

  const lockStyle = useAnimatedStyle(() => ({
    opacity: 1 - iconReveal.value,
    transform: [{ scale: 1 - iconReveal.value * 0.2 }],
  }));

  const ribbonStyle = useAnimatedStyle(() => ({
    opacity: iconReveal.value,
    transform: [{ scale: 0.8 + iconReveal.value * 0.2 }],
  }));

  return (
    <Clickable
      style={styles.wrapper}
      onPress={handlePress}
      accessibilityLabel={`${badge.label} badge`}
      accessibilityRole="button"
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glow,
          glowStyle,
          { backgroundColor: withAlpha(accent, 0.2) },
        ]}
      />
      <Animated.View style={[styles.circle, circleStyle]}>
        <Animated.View style={[styles.iconLayer, lockStyle]}>
          <Ionicons name="lock-closed" size={16} color={colors.muted} />
        </Animated.View>
        <Animated.View style={[styles.iconLayer, ribbonStyle]}>
          <Ionicons name="ribbon" size={16} color={accent} />
        </Animated.View>
      </Animated.View>
      {!unlocked && progress > 0 ? (
        <View style={[styles.progressBadge, { backgroundColor: withAlpha(colors.text, 0.72) }]}>
          <ThemedText style={[styles.progressText, { color: colors.onPrimary }]}>{progress}%</ThemedText>
        </View>
      ) : null}
    </Clickable>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 54,
    height: 54,
    borderRadius: Radii.pill,
  },
  circle: {
    width: 52,
    height: 52,
    borderRadius: Radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBadge: {
    position: 'absolute',
    bottom: 2,
    borderRadius: Radii.pill,
    paddingHorizontal: 5,
    minHeight: 16,
    justifyContent: 'center',
  },
  progressText: {
    ...Typography.micro,
    textTransform: 'none',
    lineHeight: 12,
    fontSize: 9,
  },
});
