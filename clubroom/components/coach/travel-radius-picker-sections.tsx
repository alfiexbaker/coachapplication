/**
 * Extracted sub-components for TravelRadiusPicker.
 *
 * Constants — MIN/MAX_RADIUS, MILES_TO_KM, DEBOUNCE_MS, QUICK_VALUES.
 * RadiusDisplay — large circle value + location label.
 * RadiusSlider — slider + min/mid/max labels.
 * QuickSetRow — preset buttons.
 * RadiusHelperText — info text.
 * SavedToast — animated success toast.
 * UnitToggle — miles/km toggle.
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ReanimatedView, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Radii, Typography, Shadows } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';

// ─── Constants ────────────────────────────────────────────────────────────────

export const MIN_RADIUS = 1;
export const MAX_RADIUS = 50;
export const MILES_TO_KM = 1.60934;
export const DEBOUNCE_MS = 500;
export const QUICK_VALUES = [5, 10, 15, 25, 50];

// ─── UnitToggle ───────────────────────────────────────────────────────────────

interface UnitToggleProps {
  unit: 'miles' | 'km';
  onSetMiles: () => void;
  onSetKm: () => void;
  palette: ThemeColors;
}

export const UnitToggle = memo(function UnitToggle({
  unit,
  onSetMiles,
  onSetKm,
  palette,
}: UnitToggleProps) {
  return (
    <Row style={[styles.unitToggle, { backgroundColor: palette.background }]}>
      <Clickable
        style={[styles.unitButton, unit === 'miles' ? { backgroundColor: palette.tint } : undefined]}
        onPress={onSetMiles}
        accessibilityLabel="Switch to miles"
      >
        <Text
          style={[styles.unitButtonText, { color: palette.muted }, unit === 'miles' ? { color: palette.onPrimary } : undefined]}
        >
          mi
        </Text>
      </Clickable>
      <Clickable
        style={[styles.unitButton, unit === 'km' ? { backgroundColor: palette.tint } : undefined]}
        onPress={onSetKm}
        accessibilityLabel="Switch to kilometres"
      >
        <Text
          style={[styles.unitButtonText, { color: palette.muted }, unit === 'km' ? { color: palette.onPrimary } : undefined]}
        >
          km
        </Text>
      </Clickable>
    </Row>
  );
});

// ─── RadiusDisplay ────────────────────────────────────────────────────────────

interface RadiusDisplayProps {
  displayValue: number;
  unitLabel: string;
  locationLabel: string;
  postcode?: string;
  palette: ThemeColors;
}

export const RadiusDisplay = memo(function RadiusDisplay({
  displayValue,
  unitLabel,
  locationLabel,
  postcode,
  palette,
}: RadiusDisplayProps) {
  return (
    <View style={styles.displayArea}>
      <View style={[styles.radiusCircle, { backgroundColor: palette.background }]}>
        <Text style={[styles.radiusValue, { color: palette.text }]}>{displayValue}</Text>
        <Text style={[styles.radiusUnit, { color: palette.muted }]}>{unitLabel}</Text>
      </View>
      {postcode ? (
        <Row style={styles.postcodeRow}>
          <Ionicons name="location" size={14} color={palette.tint} />
          <Text style={[styles.locationLabel, { color: palette.muted }]}>{locationLabel}</Text>
        </Row>
      ) : (
        <Text style={[styles.locationLabel, { color: palette.muted }]}>{locationLabel}</Text>
      )}
    </View>
  );
});

// ─── RadiusSlider ─────────────────────────────────────────────────────────────

interface RadiusSliderProps {
  localValue: number;
  displayValue: number;
  unitLabel: string;
  onValueChange: (value: number) => void;
  palette: ThemeColors;
}

export const RadiusSlider = memo(function RadiusSlider({
  localValue,
  displayValue,
  unitLabel,
  onValueChange,
  palette,
}: RadiusSliderProps) {
  return (
    <View>
      <Slider
        style={styles.slider}
        minimumValue={MIN_RADIUS}
        maximumValue={MAX_RADIUS}
        step={1}
        value={localValue}
        onValueChange={onValueChange}
        minimumTrackTintColor={palette.tint}
        maximumTrackTintColor={palette.border}
        thumbTintColor={palette.tint}
        accessibilityLabel={`Travel radius: ${displayValue} ${unitLabel}`}
      />
      <Row style={styles.sliderLabels}>
        <Text style={[styles.sliderLabel, { color: palette.muted }]}>{MIN_RADIUS} mi</Text>
        <Text style={[styles.sliderLabel, { color: palette.muted }]}>25 mi</Text>
        <Text style={[styles.sliderLabel, { color: palette.muted }]}>{MAX_RADIUS} mi</Text>
      </Row>
    </View>
  );
});

// ─── QuickSetRow ──────────────────────────────────────────────────────────────

interface QuickSetRowProps {
  localValue: number;
  onQuickSet: (miles: number) => void;
  palette: ThemeColors;
}

export const QuickSetRow = memo(function QuickSetRow({
  localValue,
  onQuickSet,
  palette,
}: QuickSetRowProps) {
  return (
    <Row style={styles.quickSetRow}>
      {QUICK_VALUES.map((val) => (
        <Clickable
          key={val}
          style={[
            styles.quickSetBtn,
            { backgroundColor: palette.surface, borderColor: palette.border },
            localValue === val ? { backgroundColor: palette.tint, borderColor: palette.tint } : undefined,
          ]}
          onPress={() => onQuickSet(val)}
          accessibilityLabel={`Set radius to ${val} miles`}
        >
          <Text
            style={[
              styles.quickSetText,
              { color: palette.text },
              localValue === val ? { color: palette.surface } : undefined,
            ]}
          >
            {val} mi
          </Text>
        </Clickable>
      ))}
    </Row>
  );
});

// ─── RadiusHelperText ─────────────────────────────────────────────────────────

interface RadiusHelperTextProps {
  palette: ThemeColors;
}

export const RadiusHelperText = memo(function RadiusHelperText({
  palette,
}: RadiusHelperTextProps) {
  return (
    <Row style={styles.helperArea}>
      <Ionicons name="information-circle-outline" size={16} color={palette.muted} />
      <Text style={[styles.helperText, { color: palette.muted }]}>
        Parents searching for coaches will only see you if they are within your travel
        radius. This does not apply to sessions at your own venue.
      </Text>
    </Row>
  );
});

// ─── SavedToast ───────────────────────────────────────────────────────────────

interface SavedToastProps {
  visible: boolean;
  toastOpacity: SharedValue<number>;
  palette: ThemeColors;
  scheme: 'light' | 'dark';
}

export const SavedToast = memo(function SavedToast({
  visible,
  toastOpacity,
  palette,
  scheme,
}: SavedToastProps) {
  const animStyle = useAnimatedStyle(() => ({ opacity: toastOpacity.value }));

  if (!visible) return null;

  return (
    <ReanimatedView
      style={[
        styles.toast,
        { backgroundColor: palette.surface },
        Shadows[scheme].card,
        animStyle,
      ]}
      pointerEvents="none"
    >
      <Ionicons name="checkmark-circle" size={18} color={palette.success} />
      <Text style={[styles.toastText, { color: palette.success }]}>Saved</Text>
    </ReanimatedView>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

export const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  title: {
    ...Typography.heading,
  },
  unitToggle: {
    borderRadius: Radii.pill,
    padding: Spacing.micro,
  },
  unitButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  unitButtonText: {
    ...Typography.caption,
  },
  displayArea: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  radiusCircle: {
    width: 120,
    height: 120,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  radiusValue: {
    ...Typography.display,
    fontSize: 36,
  },
  radiusUnit: {
    ...Typography.caption,
    marginTop: -4,
  },
  postcodeRow: {
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  locationLabel: {
    ...Typography.body,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xxs,
  },
  sliderLabel: {
    ...Typography.caption,
  },
  quickSetRow: {
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  quickSetBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  quickSetText: {
    ...Typography.smallSemiBold,
  },
  helperArea: {
    gap: 8,
  },
  helperText: {
    flex: 1,
    ...Typography.small,
  },
  toast: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
  },
  toastText: {
    ...Typography.bodySemiBold,
  },
});
