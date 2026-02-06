/**
 * SkillNode Component
 *
 * Renders an individual skill node in the skill tree.
 * Shows unlock status, progress, and animated transitions.
 */

import { useEffect, useRef } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
  withDelay,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii, Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { SkillNode as SkillNodeType } from '@/constants/types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface SkillNodeProps {
  node: SkillNodeType;
  themeColor: string;
  onPress?: (node: SkillNodeType) => void;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  canUnlock?: boolean;
  animateUnlock?: boolean;
}

const NODE_SIZES = {
  small: 44,
  medium: 56,
  large: 68,
};

const ICON_SIZES = {
  small: 20,
  medium: 24,
  large: 28,
};

export function SkillNode({
  node,
  themeColor,
  onPress,
  size = 'medium',
  showLabel = true,
  canUnlock = false,
  animateUnlock = false,
}: SkillNodeProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const scale = useSharedValue(1);
  const unlockAnimation = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  const rotation = useSharedValue(0);
  const hasAnimated = useRef(false);

  const nodeSize = NODE_SIZES[size];
  const iconSize = ICON_SIZES[size];

  // Animate unlock effect
  useEffect(() => {
    if (animateUnlock && node.isUnlocked && !hasAnimated.current) {
      hasAnimated.current = true;
      unlockAnimation.value = withSequence(
        withTiming(1, { duration: 300 }),
        withSpring(0.8, { damping: 10, stiffness: 100 })
      );
      glowOpacity.value = withSequence(
        withTiming(1, { duration: 200 }),
        withDelay(500, withTiming(0, { duration: 300 }))
      );
      rotation.value = withSequence(
        withTiming(10, { duration: 100 }),
        withTiming(-10, { duration: 100 }),
        withTiming(0, { duration: 100 })
      );
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [animateUnlock, node.isUnlocked, unlockAnimation, glowOpacity, rotation]);

  const handlePressIn = () => {
    scale.value = withSpring(0.92, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handlePress = () => {
    if (onPress) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress(node);
    }
  };

  const animatedContainerStyle = useAnimatedStyle(() => {
    const unlockScale = interpolate(
      unlockAnimation.value,
      [0, 1],
      [1, 1.2],
      Extrapolation.CLAMP
    );

    return {
      transform: [
        { scale: scale.value * unlockScale },
        { rotate: `${rotation.value}deg` },
      ],
    };
  });

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const isLocked = !node.isUnlocked && !canUnlock;
  const isInProgress = !node.isUnlocked && node.progress > 0;
  const progressPercent = node.progress;

  const getBackgroundColor = () => {
    if (node.isUnlocked) {
      return themeColor;
    }
    if (canUnlock) {
      return withAlpha(themeColor, 0.25);
    }
    if (isInProgress) {
      return withAlpha(themeColor, 0.12);
    }
    return palette.surface;
  };

  const getBorderColor = () => {
    if (node.isUnlocked) {
      return themeColor;
    }
    if (canUnlock || isInProgress) {
      return withAlpha(themeColor, 0.38);
    }
    return palette.border;
  };

  const getIconColor = () => {
    if (node.isUnlocked) {
      return palette.onPrimary;
    }
    if (canUnlock || isInProgress) {
      return themeColor;
    }
    return palette.muted;
  };

  return (
    <View style={styles.wrapper}>
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.nodeContainer,
          {
            width: nodeSize,
            height: nodeSize,
            borderRadius: nodeSize / 2,
            backgroundColor: getBackgroundColor(),
            borderColor: getBorderColor(),
          },
          animatedContainerStyle,
        ]}
      >
        {/* Glow effect for unlock animation */}
        <Animated.View
          style={[
            styles.glow,
            {
              width: nodeSize + 16,
              height: nodeSize + 16,
              borderRadius: (nodeSize + 16) / 2,
              backgroundColor: themeColor,
            },
            animatedGlowStyle,
          ]}
          pointerEvents="none"
        />

        {/* Progress ring for in-progress nodes */}
        {isInProgress && !node.isUnlocked && (
          <View
            style={[
              styles.progressRing,
              {
                width: nodeSize - 4,
                height: nodeSize - 4,
                borderRadius: (nodeSize - 4) / 2,
                borderColor: themeColor,
                borderLeftColor: 'transparent',
                borderBottomColor:
                  progressPercent > 50 ? themeColor : 'transparent',
                borderRightColor:
                  progressPercent > 75 ? themeColor : 'transparent',
                transform: [{ rotate: `${(progressPercent / 100) * 360}deg` }],
              },
            ]}
          />
        )}

        {/* Icon */}
        {isLocked ? (
          <Ionicons name="lock-closed" size={iconSize - 4} color={palette.muted} />
        ) : (
          <Ionicons
            name={node.icon as keyof typeof Ionicons.glyphMap}
            size={iconSize}
            color={getIconColor()}
          />
        )}

        {/* Level indicator badge */}
        <View
          style={[
            styles.levelBadge,
            {
              backgroundColor: node.isUnlocked
                ? palette.surface
                : palette.surfaceSecondary,
              borderColor: node.isUnlocked ? themeColor : palette.border,
            },
          ]}
        >
          <ThemedText
            style={[
              styles.levelText,
              { color: node.isUnlocked ? themeColor : palette.muted },
            ]}
          >
            {node.level}
          </ThemedText>
        </View>
      </AnimatedPressable>

      {/* Label */}
      {showLabel && (
        <View style={styles.labelContainer}>
          <ThemedText
            style={[
              styles.label,
              {
                color: node.isUnlocked ? palette.foreground : palette.muted,
              },
            ]}
            numberOfLines={2}
          >
            {node.name}
          </ThemedText>
          {isInProgress && (
            <ThemedText style={[styles.progressText, { color: themeColor }]}>
              {progressPercent}%
            </ThemedText>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  nodeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    opacity: 0.3,
  },
  progressRing: {
    position: 'absolute',
    borderWidth: 3,
  },
  levelBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  levelText: { ...Typography.micro },
  labelContainer: {
    alignItems: 'center',
    maxWidth: 80,
  },
  label: { ...Typography.caption, textAlign: 'center',
    lineHeight: 14 },
  progressText: { ...Typography.micro },
});
