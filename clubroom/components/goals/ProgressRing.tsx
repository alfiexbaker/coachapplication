/**
 * ProgressRing Component
 *
 * A circular progress indicator that displays goal completion percentage.
 * Features animated progress updates and customizable colors.
 */

import { useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/useTheme';
import { scaleFont } from '@/utils/scale';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ProgressRingProps {
  /** Progress percentage (0-100) */
  progress: number;
  /** Size of the ring in pixels */
  size?: number;
  /** Thickness of the ring stroke */
  strokeWidth?: number;
  /** Color of the progress ring */
  progressColor?: string;
  /** Color of the background ring */
  backgroundColor?: string;
  /** Whether to show the percentage text in the center */
  showPercentage?: boolean;
  /** Whether to animate progress changes */
  animated?: boolean;
  /** Custom label to show instead of percentage */
  label?: string;
  /** Font size for the percentage/label text */
  fontSize?: number;
}

/**
 * Circular progress ring with animated progress and customizable appearance.
 *
 * @example
 * ```tsx
 * <ProgressRing progress={75} />
 * <ProgressRing progress={50} size={60} progressColor="theme-success" />
 * <ProgressRing progress={100} label="Done" showPercentage={false} />
 * ```
 */
export function ProgressRing({
  progress,
  size = 80,
  strokeWidth = 8,
  progressColor,
  backgroundColor,
  showPercentage = true,
  animated = true,
  label,
  fontSize,
}: ProgressRingProps) {
  const { colors: palette } = useTheme();

  // Clamp progress between 0 and 100
  const clampedProgress = Math.max(0, Math.min(100, progress));

  // Calculate ring dimensions
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Animated progress value
  const animatedProgress = useSharedValue(animated ? 0 : clampedProgress);

  useEffect(() => {
    if (animated) {
      animatedProgress.value = withSpring(clampedProgress, {
        damping: 15,
        stiffness: 90,
      });
    } else {
      animatedProgress.value = clampedProgress;
    }
  }, [clampedProgress, animated, animatedProgress]);

  // Animated props for the progress circle
  const animatedCircleProps = useAnimatedProps(() => {
    const strokeDashoffset = interpolate(
      animatedProgress.value,
      [0, 100],
      [circumference, 0]
    );
    return {
      strokeDashoffset,
    };
  });

  // Determine colors
  const ringProgressColor = useMemo(() => {
    if (progressColor) return progressColor;
    if (clampedProgress === 100) return palette.success;
    if (clampedProgress >= 66) return palette.tint;
    if (clampedProgress >= 33) return palette.warning;
    return palette.muted;
  }, [progressColor, clampedProgress, palette]);

  const ringBackgroundColor = backgroundColor ?? `${palette.border}`;

  // Determine what to display in center
  const displayText = label ?? (showPercentage ? `${Math.round(clampedProgress)}%` : '');
  const textSize = fontSize ?? (size < 60 ? scaleFont(12) : scaleFont(16));

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${center}, ${center}`}>
          {/* Background circle */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={ringBackgroundColor}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress circle */}
          <AnimatedCircle
            cx={center}
            cy={center}
            r={radius}
            stroke={ringProgressColor}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={circumference}
            animatedProps={animatedCircleProps}
          />
        </G>
      </Svg>
      {displayText && (
        <View style={styles.labelContainer}>
          <ThemedText
            style={[
              styles.label,
              {
                fontSize: textSize,
                color: clampedProgress === 100 ? palette.success : palette.text,
              },
            ]}
          >
            {displayText}
          </ThemedText>
        </View>
      )}
    </View>
  );
}

/**
 * Compact progress ring for use in list items
 */
export function CompactProgressRing({
  progress,
  color,
}: {
  progress: number;
  color?: string;
}) {
  return (
    <ProgressRing
      progress={progress}
      size={40}
      strokeWidth={4}
      showPercentage
      fontSize={scaleFont(10)}
      progressColor={color}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '700',
    letterSpacing: -0.3,
  },
});
