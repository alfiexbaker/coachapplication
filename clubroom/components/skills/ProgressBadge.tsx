/**
 * ProgressBadge Component
 *
 * Displays progress toward a skill tree with animated progress ring.
 */

import { useEffect } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface ProgressBadgeProps {
  icon: string;
  label: string;
  progress: number; // 0-100
  themeColor: string;
  totalNodes: number;
  unlockedNodes: number;
  onPress?: () => void;
  size?: 'small' | 'medium' | 'large';
}

const BADGE_SIZES = {
  small: { outer: 64, inner: 52, stroke: 4, icon: 24 },
  medium: { outer: 80, inner: 64, stroke: 5, icon: 28 },
  large: { outer: 96, inner: 78, stroke: 6, icon: 32 },
};

export function ProgressBadge({
  icon,
  label,
  progress,
  themeColor,
  totalNodes,
  unlockedNodes,
  onPress,
  size = 'medium',
}: ProgressBadgeProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const scale = useSharedValue(1);
  const animatedProgress = useSharedValue(0);

  const dimensions = BADGE_SIZES[size];
  const radius = (dimensions.outer - dimensions.stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    animatedProgress.value = withTiming(progress, { duration: 800 });
  }, [progress, animatedProgress]);

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handlePress = () => {
    if (onPress) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedCircleProps = useAnimatedProps(() => {
    const strokeDashoffset = interpolate(
      animatedProgress.value,
      [0, 100],
      [circumference, 0],
      Extrapolation.CLAMP
    );
    return {
      strokeDashoffset,
    };
  });

  const isComplete = progress === 100;

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.container, animatedContainerStyle]}
    >
      {/* Progress Ring */}
      <View style={[styles.ringContainer, { width: dimensions.outer, height: dimensions.outer }]}>
        <Svg
          width={dimensions.outer}
          height={dimensions.outer}
          style={styles.svg}
        >
          {/* Background circle */}
          <Circle
            cx={dimensions.outer / 2}
            cy={dimensions.outer / 2}
            r={radius}
            stroke={palette.border}
            strokeWidth={dimensions.stroke}
            fill="none"
            opacity={0.3}
          />
          {/* Progress circle */}
          <AnimatedCircle
            cx={dimensions.outer / 2}
            cy={dimensions.outer / 2}
            r={radius}
            stroke={themeColor}
            strokeWidth={dimensions.stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={circumference}
            animatedProps={animatedCircleProps}
            rotation="-90"
            origin={`${dimensions.outer / 2}, ${dimensions.outer / 2}`}
          />
        </Svg>

        {/* Inner content */}
        <View
          style={[
            styles.innerCircle,
            {
              width: dimensions.inner,
              height: dimensions.inner,
              borderRadius: dimensions.inner / 2,
              backgroundColor: isComplete ? themeColor : palette.surface,
              borderColor: isComplete ? themeColor : palette.border,
            },
          ]}
        >
          <Ionicons
            name={icon as keyof typeof Ionicons.glyphMap}
            size={dimensions.icon}
            color={isComplete ? '#FFFFFF' : themeColor}
          />
        </View>

        {/* Completion check */}
        {isComplete && (
          <View style={[styles.completeBadge, { backgroundColor: palette.success }]}>
            <Ionicons name="checkmark" size={12} color="#FFFFFF" />
          </View>
        )}
      </View>

      {/* Label and stats */}
      <View style={styles.labelContainer}>
        <ThemedText style={[styles.label, { color: palette.foreground }]} numberOfLines={1}>
          {label}
        </ThemedText>
        <ThemedText style={[styles.stats, { color: palette.muted }]}>
          {unlockedNodes}/{totalNodes} skills
        </ThemedText>
      </View>

      {/* Progress percentage */}
      <View
        style={[
          styles.progressPill,
          {
            backgroundColor: isComplete
              ? `${palette.success}15`
              : `${themeColor}15`,
          },
        ]}
      >
        <ThemedText
          style={[
            styles.progressText,
            { color: isComplete ? palette.success : themeColor },
          ]}
        >
          {Math.round(progress)}%
        </ThemedText>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  ringContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    position: 'absolute',
    transform: [{ rotate: '-90deg' }],
  },
  innerCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  completeBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  labelContainer: {
    alignItems: 'center',
    gap: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  stats: {
    fontSize: 11,
    textAlign: 'center',
  },
  progressPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
