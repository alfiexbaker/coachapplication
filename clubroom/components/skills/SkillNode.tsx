/**
 * SkillNode Component
 *
 * Renders an individual skill node in the skill tree.
 * Shows unlock status, progress, and animated transitions.
 */

import { useEffect, useRef } from 'react';
import { View } from 'react-native';
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

import { Clickable } from '@/components/primitives/clickable';
import type { SkillNode as SkillNodeType } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

import {
  NODE_SIZES,
  ICON_SIZES,
  getBackgroundColor,
  getBorderColor,
  getIconColor,
  SkillNodeGlow,
  ProgressRing,
  NodeIcon,
  LevelBadge,
  NodeLabel,
  styles,
} from './SkillNode-sections';

const AnimatedClickable = Animated.createAnimatedComponent(Clickable);

export interface SkillNodeProps {
  node: SkillNodeType;
  themeColor: string;
  onPress?: (node: SkillNodeType) => void;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  canUnlock?: boolean;
  animateUnlock?: boolean;
}

export function SkillNode({
  node,
  themeColor,
  onPress,
  size = 'medium',
  showLabel = true,
  canUnlock = false,
  animateUnlock = false,
}: SkillNodeProps) {
  const { colors: palette } = useTheme();

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

  return (
    <View style={styles.wrapper}>
      <AnimatedClickable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={`${node.name} ${node.isUnlocked ? 'unlocked' : canUnlock ? 'unlockable' : 'locked'}`}
        accessibilityState={{ disabled: !onPress }}
        style={[
          styles.nodeContainer,
          {
            width: nodeSize,
            height: nodeSize,
            borderRadius: nodeSize / 2,
            backgroundColor: getBackgroundColor(node, themeColor, canUnlock, palette),
            borderColor: getBorderColor(node, themeColor, canUnlock, palette),
          },
          animatedContainerStyle,
        ]}
      >
        <SkillNodeGlow
          nodeSize={nodeSize}
          themeColor={themeColor}
          animatedStyle={animatedGlowStyle}
        />

        {isInProgress && !node.isUnlocked && (
          <ProgressRing
            nodeSize={nodeSize}
            progressPercent={progressPercent}
            themeColor={themeColor}
          />
        )}

        <NodeIcon
          node={node}
          iconSize={iconSize}
          isLocked={isLocked}
          iconColor={getIconColor(node, themeColor, canUnlock, palette)}
          palette={palette}
        />

        <LevelBadge
          level={node.level}
          isUnlocked={node.isUnlocked}
          themeColor={themeColor}
          palette={palette}
        />
      </AnimatedClickable>

      {showLabel && (
        <NodeLabel
          name={node.name}
          isUnlocked={node.isUnlocked}
          isInProgress={isInProgress}
          progressPercent={progressPercent}
          themeColor={themeColor}
          palette={palette}
        />
      )}
    </View>
  );
}
