/**
 * SkillConnection Component
 *
 * Draws animated connection lines between skill nodes in the tree.
 * Supports straight and curved paths with unlock animations.
 */

import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import Svg, { Line, Path } from 'react-native-svg';
import { useTheme } from '@/hooks/useTheme';

const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedPath = Animated.createAnimatedComponent(Path);

export interface ConnectionPoint {
  x: number;
  y: number;
}

export interface SkillConnectionProps {
  from: ConnectionPoint;
  to: ConnectionPoint;
  isUnlocked: boolean;
  themeColor: string;
  animationDelay?: number;
  curved?: boolean;
  containerWidth: number;
  containerHeight: number;
}

export function SkillConnection({
  from,
  to,
  isUnlocked,
  themeColor,
  animationDelay = 0,
  curved = false,
  containerWidth,
  containerHeight,
}: SkillConnectionProps) {
  const { colors: palette } = useTheme();

  const animationProgress = useSharedValue(0);

  // Convert percentage positions to actual coordinates
  const fromX = (from.x / 100) * containerWidth;
  const fromY = (from.y / 100) * containerHeight;
  const toX = (to.x / 100) * containerWidth;
  const toY = (to.y / 100) * containerHeight;

  // Calculate path length for animation
  const dx = toX - fromX;
  const dy = toY - fromY;
  const lineLength = Math.sqrt(dx * dx + dy * dy);

  useEffect(() => {
    animationProgress.value = withDelay(
      animationDelay,
      withTiming(1, {
        duration: 600,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [animationDelay, animationProgress]);

  const lineColor = isUnlocked ? themeColor : palette.border;
  const lineOpacity = isUnlocked ? 1 : 0.4;

  // Calculate curve parameters (used when curved=true)
  const midX = (fromX + toX) / 2;
  const midY = (fromY + toY) / 2;
  const perpX = -(toY - fromY) * 0.2;
  const perpY = (toX - fromX) * 0.2;
  const controlX = midX + perpX;
  const controlY = midY + perpY;
  const pathD = `M ${fromX} ${fromY} Q ${controlX} ${controlY} ${toX} ${toY}`;
  const curveLength = lineLength * 1.2;

  // Animated props for the line stroke (must be called unconditionally)
  const animatedLineProps = useAnimatedProps(() => ({
    strokeDashoffset: lineLength * (1 - animationProgress.value),
  }));

  // Animated props for curved path (must be called unconditionally)
  const animatedPathProps = useAnimatedProps(() => ({
    strokeDashoffset: curveLength * (1 - animationProgress.value),
  }));

  if (curved) {
    return (
      <View
        style={[styles.container, { width: containerWidth, height: containerHeight }]}
        pointerEvents="none"
      >
        <Svg width={containerWidth} height={containerHeight} style={StyleSheet.absoluteFill}>
          {/* Background path (dashed when locked) */}
          <Path
            d={pathD}
            stroke={palette.border}
            strokeWidth={2}
            strokeDasharray={isUnlocked ? undefined : '4 4'}
            strokeOpacity={0.3}
            fill="none"
          />
          {/* Animated foreground path */}
          <AnimatedPath
            d={pathD}
            stroke={lineColor}
            strokeWidth={2.5}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={curveLength}
            animatedProps={animatedPathProps}
            opacity={lineOpacity}
          />
        </Svg>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { width: containerWidth, height: containerHeight }]}
      pointerEvents="none"
    >
      <Svg width={containerWidth} height={containerHeight} style={StyleSheet.absoluteFill}>
        {/* Background line (dashed when locked) */}
        <Line
          x1={fromX}
          y1={fromY}
          x2={toX}
          y2={toY}
          stroke={palette.border}
          strokeWidth={2}
          strokeDasharray={isUnlocked ? undefined : '4 4'}
          strokeOpacity={0.3}
        />
        {/* Animated foreground line */}
        <AnimatedLine
          x1={fromX}
          y1={fromY}
          x2={toX}
          y2={toY}
          stroke={lineColor}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeDasharray={lineLength}
          animatedProps={animatedLineProps}
          opacity={lineOpacity}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
