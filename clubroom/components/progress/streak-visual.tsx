import { memo, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { HapticPatterns } from '@/utils/haptics';

interface StreakVisualProps {
  currentWeeks: number;
  nextMilestone: number;
}

const MILESTONES = [4, 8, 12, 26, 52] as const;
const SPARKS = [
  { x: -14, y: -30, delay: 0 },
  { x: -5, y: -36, delay: 35 },
  { x: 6, y: -34, delay: 70 },
  { x: 13, y: -28, delay: 105 },
] as const;

function resolveFlame(currentWeeks: number): { size: number; colorTier: 'warm' | 'hot' | 'blue_hot' } {
  if (currentWeeks >= 26) {
    return { size: 22, colorTier: 'blue_hot' };
  }
  if (currentWeeks >= 12) {
    return { size: 20, colorTier: 'hot' };
  }
  if (currentWeeks >= 8) {
    return { size: 18, colorTier: 'hot' };
  }
  if (currentWeeks >= 4) {
    return { size: 18, colorTier: 'warm' };
  }
  return { size: 16, colorTier: 'warm' };
}

export const StreakVisual = memo(function StreakVisual({
  currentWeeks,
  nextMilestone,
}: StreakVisualProps) {
  const { colors } = useTheme();
  const safeCurrent = Math.max(0, currentWeeks);
  const safeMilestone = Math.max(1, nextMilestone);
  const totalDots = Math.min(8, Math.max(4, safeMilestone));

  const flame = resolveFlame(safeCurrent);
  const flameColor =
    flame.colorTier === 'blue_hot'
      ? colors.info
      : flame.colorTier === 'hot'
        ? colors.error
        : colors.warning;

  const dots = useMemo(() => {
    return Array.from({ length: totalDots }).map((_, index) => index + 1);
  }, [totalDots]);
  const wiggle = useSharedValue(-3);
  const breathe = useSharedValue(0);
  const burst = useSharedValue(0);
  const sparks = useSharedValue(0);
  const previousStreakRef = useRef<number>(safeCurrent);
  const isMilestone = MILESTONES.includes(safeCurrent as (typeof MILESTONES)[number]);

  useEffect(() => {
    wiggle.value = withRepeat(
      withSequence(
        withTiming(3, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(-3, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    breathe.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [breathe, wiggle]);

  useEffect(() => {
    const previous = previousStreakRef.current;
    if (safeCurrent > previous && isMilestone) {
      burst.value = 0;
      sparks.value = 0;
      burst.value = withSequence(withTiming(1, { duration: 220 }), withTiming(0, { duration: 260 }));
      sparks.value = withSequence(withTiming(1, { duration: 500 }), withTiming(0, { duration: 250 }));
      void HapticPatterns.milestone();
    }
    previousStreakRef.current = safeCurrent;
  }, [burst, isMilestone, safeCurrent, sparks]);

  const flameStyle = useAnimatedStyle(() => {
    const baseScale = 1 + breathe.value * 0.03;
    const burstScale = 1 + burst.value * 0.5;
    return {
      transform: [
        { rotate: `${wiggle.value}deg` },
        { scale: baseScale * burstScale },
      ],
    };
  });

  const sparkStyle0 = useAnimatedStyle(() => {
    const delayed = Math.max(0, sparks.value - SPARKS[0].delay / 500);
    const progress = Math.min(1, delayed);
    return {
      opacity: progress > 0 ? 1 - progress : 0,
      transform: [
        { translateX: SPARKS[0].x * progress },
        { translateY: SPARKS[0].y * progress },
        { scale: 1 - progress * 0.2 },
      ],
    };
  });

  const sparkStyle1 = useAnimatedStyle(() => {
    const delayed = Math.max(0, sparks.value - SPARKS[1].delay / 500);
    const progress = Math.min(1, delayed);
    return {
      opacity: progress > 0 ? 1 - progress : 0,
      transform: [
        { translateX: SPARKS[1].x * progress },
        { translateY: SPARKS[1].y * progress },
        { scale: 1 - progress * 0.2 },
      ],
    };
  });

  const sparkStyle2 = useAnimatedStyle(() => {
    const delayed = Math.max(0, sparks.value - SPARKS[2].delay / 500);
    const progress = Math.min(1, delayed);
    return {
      opacity: progress > 0 ? 1 - progress : 0,
      transform: [
        { translateX: SPARKS[2].x * progress },
        { translateY: SPARKS[2].y * progress },
        { scale: 1 - progress * 0.2 },
      ],
    };
  });

  const sparkStyle3 = useAnimatedStyle(() => {
    const delayed = Math.max(0, sparks.value - SPARKS[3].delay / 500);
    const progress = Math.min(1, delayed);
    return {
      opacity: progress > 0 ? 1 - progress : 0,
      transform: [
        { translateX: SPARKS[3].x * progress },
        { translateY: SPARKS[3].y * progress },
        { scale: 1 - progress * 0.2 },
      ],
    };
  });

  const sparkStyles = [sparkStyle0, sparkStyle1, sparkStyle2, sparkStyle3];

  return (
    <Column gap="xxs">
      <Row align="center" gap="xxs">
        <View style={styles.flameWrap}>
          <Animated.View style={flameStyle}>
            <Ionicons name="flame" size={flame.size} color={flameColor} />
          </Animated.View>
          {sparkStyles.map((style, index) => (
            <Animated.View
              key={`spark-${index}`}
              pointerEvents="none"
              style={[
                styles.spark,
                style,
                { backgroundColor: withAlpha(flameColor, 0.9) },
              ]}
            />
          ))}
        </View>
        <ThemedText style={styles.label}>
          {safeCurrent} week{safeCurrent === 1 ? '' : 's'} streak
        </ThemedText>
      </Row>

      <Row align="center" gap="xxs" wrap>
        {dots.map((week) => {
          const filled = week <= safeCurrent;
          const isCurrent = week === safeCurrent && safeCurrent > 0;
          return (
            <Row
              key={week}
              style={[
                styles.dot,
                {
                  backgroundColor: filled ? flameColor : withAlpha(colors.border, 0.35),
                  borderColor: isCurrent ? withAlpha(colors.text, 0.2) : 'transparent',
                },
              ]}
            />
          );
        })}
      </Row>

      <ThemedText style={[styles.meta, { color: colors.muted }]}>
        Next milestone: {safeMilestone} weeks · Milestones 4/8/12/26/52
      </ThemedText>
    </Column>
  );
});

const styles = StyleSheet.create({
  flameWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spark: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: Radii.pill,
  },
  label: {
    ...Typography.bodySmallSemiBold,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  meta: {
    ...Typography.caption,
  },
});
