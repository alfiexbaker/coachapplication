import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type TypingIndicatorProps = {
  label?: string;
};

export function TypingIndicator({ label }: TypingIndicatorProps) {
  const { colors: palette } = useTheme();
  const dotAnim0 = useRef(new Animated.Value(0.4)).current;
  const dotAnim1 = useRef(new Animated.Value(0.4)).current;
  const dotAnim2 = useRef(new Animated.Value(0.4)).current;
  const dotAnims = [dotAnim0, dotAnim1, dotAnim2] as const;

  useEffect(() => {
    const loops = dotAnims.map((anim, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 140),
          Animated.timing(anim, { toValue: 1, duration: 220, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.35, duration: 220, useNativeDriver: true }),
          Animated.delay(140),
        ]),
      ),
    );
    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [dotAnim0, dotAnim1, dotAnim2]);

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
      {[0, 1, 2].map((dot) => (
        <Animated.View
          key={dot}
          style={[
            styles.dot,
            {
              backgroundColor: palette.icon,
              opacity: dotAnims[dot],
              transform: [
                {
                  translateY: dotAnims[dot].interpolate({
                    inputRange: [0.35, 1],
                    outputRange: [0, -2],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
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
