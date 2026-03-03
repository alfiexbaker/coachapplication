import { memo, useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { ProgressLoopFilter } from '@/hooks/use-progress-loop';

interface FilterOption {
  id: ProgressLoopFilter;
  label: string;
  count: number;
}

interface ResultsFilterSegmentProps {
  options: Array<FilterOption>;
  selectedId: ProgressLoopFilter;
  onSelect: (value: ProgressLoopFilter) => void;
  reduceMotion?: boolean;
}

export const ResultsFilterSegment = memo(function ResultsFilterSegment({
  options,
  selectedId,
  onSelect,
  reduceMotion = false,
}: ResultsFilterSegmentProps) {
  const { colors } = useTheme();
  const [containerWidth, setContainerWidth] = useState(0);
  const indicatorX = useSharedValue(0);

  const selectedIndex = useMemo(
    () => Math.max(0, options.findIndex((option) => option.id === selectedId)),
    [options, selectedId],
  );

  const segmentWidth =
    containerWidth > 0 ? (containerWidth - Spacing.micro * 2) / Math.max(1, options.length) : 0;

  useEffect(() => {
    indicatorX.value = withTiming(segmentWidth * selectedIndex + Spacing.micro, {
      duration: reduceMotion ? 0 : 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [indicatorX, reduceMotion, segmentWidth, selectedIndex]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

  const handleLayout = (event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  };

  return (
    <View
      style={[styles.outer, { borderColor: colors.border, backgroundColor: colors.surface }]}
      onLayout={handleLayout}
      accessibilityRole="tablist"
      accessibilityLabel="Task filter"
    >
      {segmentWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.indicator,
            indicatorStyle,
            {
              width: segmentWidth,
              backgroundColor: withAlpha(colors.tint, 0.12),
              borderColor: withAlpha(colors.tint, 0.36),
            },
          ]}
        />
      ) : null}

      <Row style={styles.row}>
        {options.map((option) => {
          const selected = option.id === selectedId;
          const countColor =
            option.id === 'overdue' && option.count > 0
              ? colors.error
              : selected
                ? colors.tint
                : colors.muted;

          return (
            <Clickable
              key={option.id}
              onPress={() => onSelect(option.id)}
              style={styles.segment}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={`Show ${option.label.toLowerCase()} tasks. ${option.count} items.`}
            >
              <ThemedText
                style={[
                  styles.label,
                  {
                    color: selected ? colors.tint : colors.text,
                  },
                ]}
                numberOfLines={1}
              >
                {option.label}
              </ThemedText>
              <View
                style={[
                  styles.countPill,
                  {
                    borderColor: withAlpha(countColor, 0.3),
                    backgroundColor: withAlpha(countColor, 0.12),
                  },
                ]}
              >
                <ThemedText style={[styles.countText, { color: countColor }]}>{option.count}</ThemedText>
              </View>
            </Clickable>
          );
        })}
      </Row>
    </View>
  );
});

const styles = StyleSheet.create({
  outer: {
    borderWidth: 1,
    borderRadius: Radii.pill,
    padding: Spacing.micro,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: Spacing.micro,
    bottom: Spacing.micro,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  row: {
    width: '100%',
  },
  segment: {
    flex: 1,
    minHeight: 44,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  label: {
    ...Typography.caption,
  },
  countPill: {
    minWidth: 22,
    borderWidth: 1,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.xxs,
    paddingVertical: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    ...Typography.micro,
  },
});
