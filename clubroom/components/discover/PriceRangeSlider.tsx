/**
 * PriceRangeSlider Component
 *
 * A dual-thumb slider for selecting a price range.
 * Shows min/max values and formatted currency display.
 */

import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface PriceRangeSliderProps {
  min: number;
  max: number;
  currentMin: number;
  currentMax: number;
  step?: number;
  onChange: (min: number, max: number) => void;
  formatValue?: (value: number) => string;
}

const TRACK_HEIGHT = 4;
const THUMB_SIZE = 24;
const SLIDER_PADDING = THUMB_SIZE / 2;

export function PriceRangeSlider({
  min,
  max,
  currentMin,
  currentMax,
  step = 5,
  onChange,
  formatValue = (v) => `$${v}`,
}: PriceRangeSliderProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const [sliderWidth, setSliderWidth] = useState(0);

  // Convert value to position
  const valueToPosition = useCallback(
    (value: number) => {
      const range = max - min;
      if (range === 0) return 0;
      return ((value - min) / range) * sliderWidth;
    },
    [min, max, sliderWidth]
  );

  // Convert position to value
  const positionToValue = useCallback(
    (position: number) => {
      const range = max - min;
      const rawValue = (position / sliderWidth) * range + min;
      // Snap to step
      const steppedValue = Math.round(rawValue / step) * step;
      return Math.max(min, Math.min(max, steppedValue));
    },
    [min, max, step, sliderWidth]
  );

  // Shared values for thumb positions
  const minPosition = useSharedValue(valueToPosition(currentMin));
  const maxPosition = useSharedValue(valueToPosition(currentMax));

  // Update positions when props change
  if (sliderWidth > 0) {
    const newMinPos = valueToPosition(currentMin);
    const newMaxPos = valueToPosition(currentMax);
    if (Math.abs(minPosition.value - newMinPos) > 1) {
      minPosition.value = newMinPos;
    }
    if (Math.abs(maxPosition.value - newMaxPos) > 1) {
      maxPosition.value = newMaxPos;
    }
  }

  const handleMinChange = useCallback(
    (newMin: number) => {
      const clampedMin = Math.min(newMin, currentMax - step);
      onChange(clampedMin, currentMax);
    },
    [currentMax, step, onChange]
  );

  const handleMaxChange = useCallback(
    (newMax: number) => {
      const clampedMax = Math.max(newMax, currentMin + step);
      onChange(currentMin, clampedMax);
    },
    [currentMin, step, onChange]
  );

  // Min thumb gesture
  const minGesture = Gesture.Pan()
    .onUpdate((event) => {
      const newPosition = Math.max(0, Math.min(event.absoluteX - SLIDER_PADDING, maxPosition.value - THUMB_SIZE));
      minPosition.value = newPosition;
      runOnJS(handleMinChange)(positionToValue(newPosition));
    });

  // Max thumb gesture
  const maxGesture = Gesture.Pan()
    .onUpdate((event) => {
      const newPosition = Math.max(minPosition.value + THUMB_SIZE, Math.min(event.absoluteX - SLIDER_PADDING, sliderWidth));
      maxPosition.value = newPosition;
      runOnJS(handleMaxChange)(positionToValue(newPosition));
    });

  // Animated styles
  const minThumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: minPosition.value }],
  }));

  const maxThumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: maxPosition.value }],
  }));

  const rangeStyle = useAnimatedStyle(() => ({
    left: minPosition.value + THUMB_SIZE / 2,
    right: sliderWidth - maxPosition.value + THUMB_SIZE / 2,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={[styles.label, { color: palette.text }]}>Price Range</ThemedText>
        <ThemedText style={[styles.value, { color: palette.tint }]}>
          {formatValue(currentMin)} - {formatValue(currentMax)}
        </ThemedText>
      </View>

      <View
        style={styles.sliderContainer}
        onLayout={(e) => setSliderWidth(e.nativeEvent.layout.width - THUMB_SIZE)}
      >
        {/* Track background */}
        <View style={[styles.track, { backgroundColor: palette.border }]} />

        {/* Active range */}
        <Animated.View
          style={[
            styles.activeRange,
            { backgroundColor: palette.tint },
            rangeStyle,
          ]}
        />

        {/* Min thumb */}
        <GestureDetector gesture={minGesture}>
          <Animated.View
            style={[
              styles.thumb,
              {
                backgroundColor: palette.surface,
                borderColor: palette.tint,
              },
              minThumbStyle,
            ]}
          />
        </GestureDetector>

        {/* Max thumb */}
        <GestureDetector gesture={maxGesture}>
          <Animated.View
            style={[
              styles.thumb,
              {
                backgroundColor: palette.surface,
                borderColor: palette.tint,
              },
              maxThumbStyle,
            ]}
          />
        </GestureDetector>
      </View>

      <View style={styles.rangeLabels}>
        <ThemedText style={[styles.rangeLabel, { color: palette.muted }]}>
          {formatValue(min)}
        </ThemedText>
        <ThemedText style={[styles.rangeLabel, { color: palette.muted }]}>
          {formatValue(max)}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  label: {
    ...Typography.bodySemiBold,
  },
  value: {
    ...Typography.bodySemiBold,
  },
  sliderContainer: {
    height: THUMB_SIZE + Spacing.sm,
    justifyContent: 'center',
    paddingHorizontal: SLIDER_PADDING,
  },
  track: {
    position: 'absolute',
    left: SLIDER_PADDING,
    right: SLIDER_PADDING,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
  },
  activeRange: {
    position: 'absolute',
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  rangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    paddingHorizontal: SLIDER_PADDING,
  },
  rangeLabel: {
    ...Typography.xs,
  },
});
