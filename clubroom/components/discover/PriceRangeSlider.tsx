import { useEffect, useRef, useState, startTransition } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import type { PanGesture } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { Shadows, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';

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
const MIN_GAP = 5;
const ON_CHANGE_DEBOUNCE_MS = 200;

function createDebounce<T extends unknown[]>(fn: (...args: T) => void, ms: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const debounced = (...args: T) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
  debounced.cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }
  };
  return debounced;
}

function formatPriceRangeValue(value: number): string {
  return `£${value}`;
}

function createMinGesture({
  maxPosition,
  minPosition,
  positionToValue,
  handleMinChange,
}: {
  maxPosition: SharedValue<number>;
  minPosition: SharedValue<number>;
  positionToValue: (position: number) => number;
  handleMinChange: (newMin: number, immediate?: boolean) => void;
}) {
  return Gesture.Pan()
    .onUpdate((event) => {
      const newPosition = Math.max(
        0,
        Math.min(event.absoluteX - SLIDER_PADDING, maxPosition.value - THUMB_SIZE),
      );
      minPosition.set(newPosition);
      runOnJS(handleMinChange)(positionToValue(newPosition), false);
    })
    .onEnd(() => {
      runOnJS(handleMinChange)(positionToValue(minPosition.value), true);
    });
}

function createMaxGesture({
  minPosition,
  maxPosition,
  sliderWidth,
  positionToValue,
  handleMaxChange,
}: {
  minPosition: SharedValue<number>;
  maxPosition: SharedValue<number>;
  sliderWidth: number;
  positionToValue: (position: number) => number;
  handleMaxChange: (newMax: number, immediate?: boolean) => void;
}) {
  return Gesture.Pan()
    .onUpdate((event) => {
      const newPosition = Math.max(
        minPosition.value + THUMB_SIZE,
        Math.min(event.absoluteX - SLIDER_PADDING, sliderWidth),
      );
      maxPosition.set(newPosition);
      runOnJS(handleMaxChange)(positionToValue(newPosition), false);
    })
    .onEnd(() => {
      runOnJS(handleMaxChange)(positionToValue(maxPosition.value), true);
    });
}

export function PriceRangeSlider({
  min,
  max,
  currentMin,
  currentMax,
  step = 5,
  onChange,
  formatValue = formatPriceRangeValue,
}: PriceRangeSliderProps) {
  const { colors: palette, scheme } = useTheme();
  const [sliderWidth, setSliderWidth] = useState(0);
  const debouncedOnChangeRef = useRef<ReturnType<typeof createDebounce<[number, number]>> | null>(
    null,
  );

  const valueToPosition = (value: number) => {
    const range = max - min;
    if (range === 0) return 0;
    return ((value - min) / range) * sliderWidth;
  };

  const positionToValue = (position: number) => {
    const range = max - min;
    const rawValue = (position / sliderWidth) * range + min;
    const steppedValue = Math.round(rawValue / step) * step;
    return Math.max(min, Math.min(max, steppedValue));
  };

  const minPosition = useSharedValue(valueToPosition(currentMin));
  const maxPosition = useSharedValue(valueToPosition(currentMax));
  const [minGesture, setMinGesture] = useState<PanGesture | null>(null);
  const [maxGesture, setMaxGesture] = useState<PanGesture | null>(null);

  if (sliderWidth > 0) {
    const newMinPos = valueToPosition(currentMin);
    const newMaxPos = valueToPosition(currentMax);
    if (Math.abs(minPosition.value - newMinPos) > 1) {
      minPosition.set(newMinPos);
    }
    if (Math.abs(maxPosition.value - newMaxPos) > 1) {
      maxPosition.set(newMaxPos);
    }
  }

  const emitChangeImmediately = (nextMin: number, nextMax: number) => {
    debouncedOnChangeRef.current?.cancel();
    onChange(nextMin, nextMax);
  };

  const debouncedOnChange = createDebounce(
    (nextMin: number, nextMax: number) => onChange(nextMin, nextMax),
    ON_CHANGE_DEBOUNCE_MS,
  );

  useEffect(() => {
    debouncedOnChangeRef.current = debouncedOnChange;
    return () => {
      debouncedOnChange.cancel();
    };
  }, [debouncedOnChange]);

  const handleMinChange = (newMin: number, immediate = false) => {
    const minGap = Math.max(MIN_GAP, step);
    const boundary = currentMax - minGap;
    const clampedMin = Math.min(newMin, boundary);
    if (newMin > boundary && Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (immediate) {
      emitChangeImmediately(clampedMin, currentMax);
    } else {
      debouncedOnChange(clampedMin, currentMax);
    }
  };

  const handleMaxChange = (newMax: number, immediate = false) => {
    const minGap = Math.max(MIN_GAP, step);
    const boundary = currentMin + minGap;
    const clampedMax = Math.max(newMax, boundary);
    if (newMax < boundary && Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (immediate) {
      emitChangeImmediately(currentMin, clampedMax);
    } else {
      debouncedOnChange(currentMin, clampedMax);
    }
  };
  const positionToValueRef = useRef(positionToValue);
  const handleMinChangeRef = useRef(handleMinChange);
  const handleMaxChangeRef = useRef(handleMaxChange);

  useEffect(() => {
    positionToValueRef.current = positionToValue;
    handleMinChangeRef.current = handleMinChange;
    handleMaxChangeRef.current = handleMaxChange;
  });

  useEffect(() => {
    startTransition(() => {
      setMinGesture(() =>
        createMinGesture({
          maxPosition,
          minPosition,
          positionToValue: (position) => positionToValueRef.current(position),
          handleMinChange: (newMin, immediate) => handleMinChangeRef.current(newMin, immediate),
        }),
      );
    });
  }, [maxPosition, minPosition]);

  useEffect(() => {
    startTransition(() => {
      setMaxGesture(() =>
        createMaxGesture({
          minPosition,
          maxPosition,
          sliderWidth,
          positionToValue: (position) => positionToValueRef.current(position),
          handleMaxChange: (newMax, immediate) => handleMaxChangeRef.current(newMax, immediate),
        }),
      );
    });
  }, [maxPosition, minPosition, sliderWidth]);

  const minThumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: minPosition.value }],
  }));

  const maxThumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: maxPosition.value }],
  }));

  const rangeStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: minPosition.value + THUMB_SIZE / 2 },
      {
        scaleX:
          sliderWidth > 0
            ? Math.max(0, maxPosition.value - minPosition.value - THUMB_SIZE) / sliderWidth
            : 0,
      },
    ],
  }));

  return (
    <View style={styles.container}>
      <Row style={styles.header}>
        <ThemedText style={[styles.label, { color: palette.text }]}>Price Range</ThemedText>
        <ThemedText style={[styles.value, { color: palette.tint }]}>
          {formatValue(currentMin)} - {formatValue(currentMax)}
        </ThemedText>
      </Row>

      <View
        style={styles.sliderContainer}
        onLayout={(e) => setSliderWidth(e.nativeEvent.layout.width - THUMB_SIZE)}
      >
        <View style={[styles.track, { backgroundColor: palette.border }]} />

        <Animated.View
          style={[styles.activeRange, { backgroundColor: palette.tint }, rangeStyle]}
        />

        {minGesture ? (
          <GestureDetector gesture={minGesture}>
            <Animated.View
              style={[
                styles.thumb,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.tint,
                  ...Shadows[scheme].subtle,
                },
                minThumbStyle,
              ]}
            />
          </GestureDetector>
        ) : (
          <Animated.View
            style={[
              styles.thumb,
              {
                backgroundColor: palette.surface,
                borderColor: palette.tint,
                ...Shadows[scheme].subtle,
              },
              minThumbStyle,
            ]}
          />
        )}

        {maxGesture ? (
          <GestureDetector gesture={maxGesture}>
            <Animated.View
              style={[
                styles.thumb,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.tint,
                  ...Shadows[scheme].subtle,
                },
                maxThumbStyle,
              ]}
            />
          </GestureDetector>
        ) : (
          <Animated.View
            style={[
              styles.thumb,
              {
                backgroundColor: palette.surface,
                borderColor: palette.tint,
                ...Shadows[scheme].subtle,
              },
              maxThumbStyle,
            ]}
          />
        )}
      </View>

      <Row style={styles.rangeLabels}>
        <ThemedText style={[styles.rangeLabel, { color: palette.muted }]}>
          {formatValue(min)}
        </ThemedText>
        <ThemedText style={[styles.rangeLabel, { color: palette.muted }]}>
          {formatValue(max)}
        </ThemedText>
      </Row>
      <ThemedText style={[styles.helperText, { color: palette.muted }]}>
        Minimum £{Math.max(MIN_GAP, step)} range
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.sm,
  },
  header: {
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
    left: SLIDER_PADDING,
    width: '100%',
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    transformOrigin: 'left center',
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    borderWidth: 2,
  },
  rangeLabels: {
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    paddingHorizontal: SLIDER_PADDING,
  },
  rangeLabel: {
    ...Typography.xs,
  },
  helperText: {
    ...Typography.caption,
    marginTop: Spacing.xs,
    textAlign: 'right',
  },
});
