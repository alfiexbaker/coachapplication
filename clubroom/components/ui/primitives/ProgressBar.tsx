/**
 * ProgressBar Primitive
 *
 * Horizontal progress indicator with semantic colors and optional animation.
 *
 * Usage:
 *   <ProgressBar progress={0.7} />
 *   <ProgressBar progress={0.3} color="warning" height={6} />
 *   <ProgressBar progress={progress} color="success" animated />
 */

import React, { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTheme, type ThemeColors } from '@/hooks/useTheme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProgressBarColor = 'success' | 'warning' | 'error' | 'info' | 'default';

export interface ProgressBarProps {
  /** Progress value between 0 and 1 */
  progress: number;
  /** Semantic color for the fill bar */
  color?: ProgressBarColor;
  /** Bar height in pixels (default: 4) */
  height?: number;
  /** Animate progress changes (default: true) */
  animated?: boolean;
  /** Additional container style */
  style?: StyleProp<ViewStyle>;
}

// ---------------------------------------------------------------------------
// Color resolver
// ---------------------------------------------------------------------------

function resolveBarColor(color: ProgressBarColor, palette: ThemeColors): string {
  switch (color) {
    case 'success': return palette.success;
    case 'warning': return palette.warning;
    case 'error': return palette.error;
    case 'info': return palette.info;
    case 'default':
    default: return palette.tint;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function ProgressBarInner({
  progress,
  color = 'default',
  height = 4,
  animated = true,
  style,
}: ProgressBarProps) {
  const { colors } = useTheme();
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const fillColor = resolveBarColor(color, colors);
  const widthValue = useSharedValue(animated ? 0 : clampedProgress);

  useEffect(() => {
    if (animated) {
      widthValue.value = withSpring(clampedProgress, {
        damping: 20,
        stiffness: 200,
      });
    } else {
      widthValue.value = clampedProgress;
    }
  }, [animated, clampedProgress, widthValue]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${widthValue.value * 100}%`,
  }));

  return (
    <View
      style={[
        styles.track,
        { height, borderRadius: height / 2, backgroundColor: colors.border },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.fill,
          { backgroundColor: fillColor, borderRadius: height / 2 },
          fillStyle,
        ]}
      />
    </View>
  );
}

export const ProgressBar = React.memo(ProgressBarInner);

// ---------------------------------------------------------------------------
// Styles (color-independent)
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
