import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type TypingIndicatorProps = {
  label?: string;
};

export function TypingIndicator({ label }: TypingIndicatorProps) {
  const { colors: palette } = useTheme();
  const dot0 = useSharedValue(0.35);
  const dot1 = useSharedValue(0.35);
  const dot2 = useSharedValue(0.35);

  useEffect(() => {
    const cycle = () =>
      withRepeat(
        withSequence(
          withTiming(1, { duration: 220 }),
          withTiming(0.35, { duration: 220 }),
          withDelay(140, withTiming(0.35, { duration: 1 })),
        ),
        -1,
      );
    dot0.set(cycle());
    dot1.set(withDelay(140, cycle()));
    dot2.set(withDelay(280, cycle()));
    return () => {
      cancelAnimation(dot0);
      cancelAnimation(dot1);
      cancelAnimation(dot2);
    };
  }, [dot0, dot1, dot2]);

  const dot0Style = useAnimatedStyle(() => ({
    opacity: dot0.value,
    transform: [{ translateY: dot0.value > 0.35 ? -2 : 0 }],
  }));
  const dot1Style = useAnimatedStyle(() => ({
    opacity: dot1.value,
    transform: [{ translateY: dot1.value > 0.35 ? -2 : 0 }],
  }));
  const dot2Style = useAnimatedStyle(() => ({
    opacity: dot2.value,
    transform: [{ translateY: dot2.value > 0.35 ? -2 : 0 }],
  }));

  return (
    <Row
      align="center"
      gap="xs"
      style={[styles.container, { backgroundColor: palette.surface, borderColor: palette.border }]}
    >
      {label ? (
        <ThemedText style={[styles.label, { color: palette.muted }]} numberOfLines={1}>
          {label}
        </ThemedText>
      ) : null}
      <Animated.View style={[styles.dot, dot0Style, { backgroundColor: palette.icon }]} />
      <Animated.View style={[styles.dot, dot1Style, { backgroundColor: palette.icon }]} />
      <Animated.View style={[styles.dot, dot2Style, { backgroundColor: palette.icon }]} />
    </Row>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  label: {
    flexShrink: 1,
  },
  dot: {
    height: 8,
    width: 8,
    borderRadius: Radii.pill,
    opacity: 0.6,
  },
});
