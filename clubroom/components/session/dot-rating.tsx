import React, { memo, useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { HapticPatterns } from '@/utils/haptics';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const DOT_VALUES = [1, 2, 3, 4, 5] as const;

interface DotRatingProps {
  label: string;
  icon: IoniconName;
  value: number;
  onChange: (value: number) => void;
}

function clampRating(value: number): number {
  return Math.max(1, Math.min(5, Math.round(value)));
}

interface DotButtonProps {
  dot: (typeof DOT_VALUES)[number];
  label: string;
  filled: boolean;
  mutedBorder: string;
  fillColor: string;
  pulseDot: number | null;
  onPress: () => void;
}

const DotButton = memo(function DotButton({
  dot,
  label,
  filled,
  mutedBorder,
  fillColor,
  pulseDot,
  onPress,
}: DotButtonProps) {
  const fillProgress = useSharedValue(filled ? 1 : 0);
  const pulseProgress = useSharedValue(0);
  const fillBackground = withAlpha(fillColor, 0.16);

  useEffect(() => {
    fillProgress.value = withTiming(filled ? 1 : 0, { duration: 150 });
  }, [fillProgress, filled]);

  useEffect(() => {
    if (pulseDot !== dot) {
      return;
    }
    pulseProgress.value = 0;
    pulseProgress.value = withSequence(
      withTiming(1, { duration: 100 }),
      withTiming(0, { duration: 110 }),
    );
  }, [dot, pulseDot, pulseProgress]);

  const animatedStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(fillProgress.value, [0, 1], [mutedBorder, fillColor]),
    backgroundColor: interpolateColor(
      fillProgress.value,
      [0, 1],
      ['#00000000', fillBackground],
    ),
    transform: [{ scale: 1 + pulseProgress.value * 0.3 }],
  }));

  return (
    <Animated.View style={[styles.dotButton, animatedStyle]}>
      <Clickable
        onPress={onPress}
        style={styles.dotTouch}
        accessibilityLabel={`${label} rating ${dot} of 5`}
        accessibilityRole="button"
        accessibilityState={{ selected: filled }}
      >
        <Ionicons
          name={filled ? 'ellipse' : 'ellipse-outline'}
          size={16}
          color={filled ? fillColor : mutedBorder}
        />
      </Clickable>
    </Animated.View>
  );
});

export const DotRating = memo(function DotRating({ label, icon, value, onChange }: DotRatingProps) {
  const { colors } = useTheme();
  const normalizedValue = clampRating(value);
  const [pulseDot, setPulseDot] = useState<number | null>(null);

  const dotColors: Record<(typeof DOT_VALUES)[number], string> = {
    1: colors.error,
    2: colors.warning,
    3: colors.rating,
    4: colors.success,
    5: colors.info,
  };

  const handleSelect = useCallback(
    (nextValue: number) => {
      void HapticPatterns.tap();
      setPulseDot(nextValue);
      onChange(nextValue);
    },
    [onChange],
  );

  return (
    <Row align="center" justify="between" style={styles.row}>
      <Row align="center" gap="xs" style={styles.labelWrap}>
        <Ionicons name={icon} size={18} color={colors.tint} />
        <ThemedText style={styles.label}>{label}</ThemedText>
      </Row>

      <Row gap="xxs">
        {DOT_VALUES.map((dot) => {
          const filled = dot <= normalizedValue;
          return (
            <DotButton
              key={`${label}-${dot}`}
              dot={dot}
              label={label}
              filled={filled}
              mutedBorder={colors.border}
              fillColor={dotColors[dot]}
              pulseDot={pulseDot}
              onPress={() => handleSelect(dot)}
            />
          );
        })}
      </Row>
    </Row>
  );
});

const styles = StyleSheet.create({
  row: {
    minHeight: 44,
  },
  labelWrap: {
    flex: 1,
    marginRight: Spacing.xs,
  },
  label: {
    ...Typography.bodySmall,
  },
  dotButton: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: Radii.pill,
    borderWidth: 1,
    overflow: 'hidden',
  },
  dotTouch: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
