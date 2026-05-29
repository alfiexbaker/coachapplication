import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { HapticPatterns } from '@/utils/haptics';

const RATING_VALUES = [1, 2, 3, 4, 5] as const;

interface RatingBarProps {
  /** null/undefined = unrated, 1-5 = rated */
  value?: number | null;
  onChange: (value: number) => void;
  /** Visual height of segments. Touch target is always ≥44px via padding. */
  height?: number;
  /** Previous rating (1-5) — shown as a ghost marker for context. */
  previousValue?: number;
}

// ─── Segment ─────────────────────────────────────────────────────────────────

interface SegmentProps {
  filled: boolean;
  isGhost: boolean;
  isFirst: boolean;
  isLast: boolean;
  fillColor: string;
  emptyColor: string;
  ghostColor: string;
  onPress: () => void;
  height: number;
}

const Segment = function Segment({
  filled,
  isGhost,
  isFirst,
  isLast,
  fillColor,
  emptyColor,
  ghostColor,
  onPress,
  height,
}: SegmentProps) {
  const progress = useSharedValue(filled ? 1 : 0);
  const scale = useSharedValue(1);

  useEffect(() => {
    progress.set(withTiming(filled ? 1 : 0, { duration: 180 }));
  }, [filled, progress]);

  // Ghost segments (previous value) get a subtle tint even when not filled
  const baseEmpty = isGhost ? ghostColor : emptyColor;

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [baseEmpty, fillColor],
    ),
    transform: [{ scaleY: scale.value }],
  }));

  const handlePress = () => {
    scale.set(withSequence(
      withTiming(1.15, { duration: 80 }),
      withTiming(1, { duration: 100 }),
    ));
    onPress();
  };

  const radius = height / 2;

  return (
    <Animated.View
      style={[
        styles.segment,
        {
          height,
          borderTopLeftRadius: isFirst ? radius : Radii.xs,
          borderBottomLeftRadius: isFirst ? radius : Radii.xs,
          borderTopRightRadius: isLast ? radius : Radii.xs,
          borderBottomRightRadius: isLast ? radius : Radii.xs,
        },
        animatedStyle,
      ]}
    >
      <Clickable
        onPress={handlePress}
        style={styles.segmentTouch}
        accessibilityRole="button"
      />
    </Animated.View>
  );
};

// ─── RatingBar ───────────────────────────────────────────────────────────────

export const RatingBar = function RatingBar({
  value,
  onChange,
  height = 28,
  previousValue,
}: RatingBarProps) {
  const { colors } = useTheme();
  const fillColor = colors.tint;
  const emptyColor = withAlpha(colors.muted, 0.12);
  const ghostColor = withAlpha(colors.muted, 0.25);

  const normalizedValue =
    typeof value === 'number' && value >= 1 && value <= 5 ? Math.round(value) : null;
  const handlePress = (rating: number) => {
    void HapticPatterns.tap();
    if (rating < 1) return;
    onChange(Math.max(1, rating));
  };

  const safePrevious = previousValue && previousValue > 0 ? Math.round(previousValue) : 0;

  return (
    <View style={[styles.barContainer, { minHeight: Math.max(height, 44) }]}>
      <Row gap="micro" style={[styles.barInner, { height }]}>
        {RATING_VALUES.map((rating, i) => {
          const isFilled = normalizedValue !== null && rating <= normalizedValue;
          // Show ghost only on segments that were previously filled but aren't currently
          const isGhost = !isFilled && safePrevious > 0 && rating <= safePrevious;

          return (
            <Segment
              key={rating}
              filled={isFilled}
              isGhost={isGhost}
              isFirst={i === 0}
              isLast={i === 4}
              fillColor={fillColor}
              emptyColor={emptyColor}
              ghostColor={ghostColor}
              onPress={() => handlePress(rating)}
              height={height}
            />
          );
        })}
      </Row>
      {normalizedValue === null ? (
        <ThemedText style={[styles.helperText, { color: colors.muted }]}>
          Tap to rate (1-5 stars)
        </ThemedText>
      ) : null}
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  barContainer: {
    justifyContent: 'center',
  },
  barInner: {},
  helperText: {
    marginTop: Spacing.xs,
  },
  segment: {
    flex: 1,
    overflow: 'hidden',
  },
  segmentTouch: {
    flex: 1,
  },
});
