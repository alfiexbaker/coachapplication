import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { ThemedText } from '@/components/themed-text';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ReadinessRingProps {
  score: number;
  label?: string;
  meta?: string;
  size?: number;
  strokeWidth?: number;
  reduceMotion?: boolean;
}

function clampScore(score: number): number {
  if (Number.isNaN(score)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

export const ReadinessRing = function ReadinessRing({
  score,
  label = 'Readiness',
  meta,
  size = 108,
  strokeWidth = 10,
  reduceMotion = false,
}: ReadinessRingProps) {
  const { colors } = useTheme();
  const safeScore = clampScore(score);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = useSharedValue(safeScore / 100);

  useEffect(() => {
    progress.set(withTiming(safeScore / 100, {
      duration: reduceMotion ? 0 : 560,
      easing: Easing.out(Easing.cubic),
    }));
  }, [progress, reduceMotion, safeScore]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  return (
    <View style={[styles.container, { width: size, height: size }]}> 
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={withAlpha(colors.tint, 0.2)}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.tint}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          fill="none"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      <View style={styles.overlay}>
        <ThemedText style={styles.value}>{safeScore}</ThemedText>
        <ThemedText style={[styles.label, { color: colors.muted }]} numberOfLines={1}>
          {label}
        </ThemedText>
        {meta ? (
          <ThemedText style={[styles.meta, { color: colors.muted }]} numberOfLines={1}>
            {meta}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.full,
  },
  overlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    ...Typography.heading,
    fontWeight: '700',
  },
  label: {
    ...Typography.caption,
    marginTop: 2,
  },
  meta: {
    ...Typography.micro,
    marginTop: -2,
  },
});
