import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
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

const AnimatedCircle = Platform.OS === 'web' ? Circle : Animated.createAnimatedComponent(Circle);

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
  if (Platform.OS === 'web') {
    return (
      <ReadinessRingWeb
        score={score}
        label={label}
        meta={meta}
        size={size}
        strokeWidth={strokeWidth}
      />
    );
  }
  return (
    <ReadinessRingNative
      score={score}
      label={label}
      meta={meta}
      size={size}
      strokeWidth={strokeWidth}
      reduceMotion={reduceMotion}
    />
  );
};

function ReadinessRingWeb({
  score,
  label = 'Readiness',
  meta,
  size = 108,
  strokeWidth = 10,
}: ReadinessRingProps) {
  const { colors } = useTheme();
  const safeScore = clampScore(score);
  const progressDegrees = safeScore * 3.6;
  const innerSize = Math.max(0, size - strokeWidth * 2);
  const webProgressStyle = {
    backgroundImage: `conic-gradient(${colors.tint} ${progressDegrees}deg, ${withAlpha(colors.tint, 0.18)} 0deg)`,
  } as never;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <View
        style={[
          styles.webRing,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
          webProgressStyle,
        ]}
      >
        <View
          style={[
            styles.webRingInner,
            {
              width: innerSize,
              height: innerSize,
              borderRadius: innerSize / 2,
              backgroundColor: colors.background,
            },
          ]}
        />
      </View>

      <RingOverlay safeScore={safeScore} label={label} meta={meta} mutedColor={colors.muted} />
    </View>
  );
}

function ReadinessRingNative({
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
  const strokeDashoffset = circumference * (1 - safeScore / 100);
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
        {Platform.OS === 'web' ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.tint}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            fill="none"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ) : (
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
        )}
      </Svg>

      <RingOverlay safeScore={safeScore} label={label} meta={meta} mutedColor={colors.muted} />
    </View>
  );
}

function RingOverlay({
  safeScore,
  label,
  meta,
  mutedColor,
}: {
  safeScore: number;
  label: string;
  meta: string | undefined;
  mutedColor: string;
}) {
  return (
    <View style={styles.overlay}>
      <ThemedText style={styles.value}>{safeScore}</ThemedText>
      <ThemedText style={[styles.label, { color: mutedColor }]} numberOfLines={1}>
        {label}
      </ThemedText>
      {meta ? (
        <ThemedText style={[styles.meta, { color: mutedColor }]} numberOfLines={1}>
          {meta}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.full,
  },
  webRing: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  webRingInner: {
    alignItems: 'center',
    justifyContent: 'center',
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
