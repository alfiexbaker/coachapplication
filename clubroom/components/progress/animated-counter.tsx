import { useEffect, useState } from 'react';
import type { StyleProp, TextStyle } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';

interface AnimatedCounterProps {
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  style?: StyleProp<TextStyle>;
}

/**
 * Numbers that count up from 0 with spring easing.
 * Used by: MomentHero meters, ParentValueSummary stats, GoalsCompact progress.
 */
export const AnimatedCounter = function AnimatedCounter({
  value,
  suffix = '',
  prefix = '',
  decimals = 0,
  style,
}: AnimatedCounterProps) {
  const animatedValue = useSharedValue(0);
  const [displayValue, setDisplayValue] = useState(
    decimals > 0 ? value.toFixed(decimals) : String(Math.round(value)),
  );

  useEffect(() => {
    animatedValue.set(withSpring(value, {
      damping: 20,
      stiffness: 90,
      mass: 1,
    }));
  }, [animatedValue, value]);

  useAnimatedReaction(
    () => animatedValue.value,
    (current) => {
      const formatted = decimals > 0
        ? current.toFixed(decimals)
        : Math.round(current).toString();
      runOnJS(setDisplayValue)(formatted);
    },
    [decimals],
  );

  return (
    <ThemedText style={style}>
      {prefix}{displayValue}{suffix}
    </ThemedText>
  );
};
