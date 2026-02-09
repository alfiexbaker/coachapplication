/**
 * Travel Radius Picker
 *
 * Slider-based picker for setting how far a coach is willing to travel.
 * Displays "Within X miles of [postcode]" with a miles/km toggle.
 * Save is debounced to avoid excessive writes.
 *
 * USER STORY:
 * "As a coach, I want to set my travel radius so only parents within
 * my range can book sessions at their location."
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Radii, Typography, Shadows } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { createCardStyles, LayoutStyles } from '@/constants/styles';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TravelRadiusPickerProps {
  value: number;
  onChange: (miles: number) => void;
  postcode?: string;
}

type DistanceUnit = 'miles' | 'km';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MIN_RADIUS = 1;
const MAX_RADIUS = 50;
const MILES_TO_KM = 1.60934;
const DEBOUNCE_MS = 500;
const QUICK_VALUES = [5, 10, 15, 25, 50];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function TravelRadiusPicker({
  value,
  onChange,
  postcode,
}: TravelRadiusPickerProps) {
  const { colors, scheme } = useTheme();
  const CardStyles = createCardStyles(colors);
  const [unit, setUnit] = useState<DistanceUnit>('miles');
  const [localValue, setLocalValue] = useState(value);
  const [saved, setSaved] = useState(false);

  const toastOpacity = useRef(new Animated.Value(0)).current;
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync when external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  // Flash "Saved" toast
  const flashSaved = useCallback(() => {
    setSaved(true);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1200),
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setSaved(false));
  }, [toastOpacity]);

  // Debounced onChange
  const persistValue = useCallback(
    (miles: number) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        onChange(miles);
        flashSaved();
      }, DEBOUNCE_MS);
    },
    [onChange, flashSaved],
  );

  const handleSliderChange = useCallback(
    (raw: number) => {
      const rounded = Math.round(raw);
      setLocalValue(rounded);
      persistValue(rounded);
    },
    [persistValue],
  );

  const handleQuickSet = useCallback(
    (miles: number) => {
      setLocalValue(miles);
      onChange(miles);
      flashSaved();
    },
    [onChange, flashSaved],
  );

  // Display conversion
  const displayValue =
    unit === 'miles' ? localValue : Math.round(localValue * MILES_TO_KM);
  const unitLabel = unit === 'miles' ? (localValue === 1 ? 'mile' : 'miles') : 'km';
  const locationLabel = postcode
    ? `Within ${displayValue} ${unitLabel} of ${postcode}`
    : `Within ${displayValue} ${unitLabel}`;

  return (
    <View style={[CardStyles.base, Shadows[scheme].card, styles.container]}>
      {/* Header + unit toggle */}
      <View style={LayoutStyles.rowBetween}>
        <Text style={[styles.title, { color: colors.text }]}>Travel Radius</Text>
        <View style={[styles.unitToggle, { backgroundColor: colors.background }]}>
          <Pressable
            style={[styles.unitButton, unit === 'miles' ? { backgroundColor: colors.tint } : undefined]}
            onPress={() => setUnit('miles')}
            accessibilityRole="button"
            accessibilityLabel="Switch to miles"
          >
            <Text
              style={[styles.unitButtonText, { color: colors.muted }, unit === 'miles' ? { color: colors.onPrimary } : undefined]}
            >
              mi
            </Text>
          </Pressable>
          <Pressable
            style={[styles.unitButton, unit === 'km' ? { backgroundColor: colors.tint } : undefined]}
            onPress={() => setUnit('km')}
            accessibilityRole="button"
            accessibilityLabel="Switch to kilometres"
          >
            <Text
              style={[styles.unitButtonText, { color: colors.muted }, unit === 'km' ? { color: colors.onPrimary } : undefined]}
            >
              km
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Large value display */}
      <View style={styles.displayArea}>
        <View style={[styles.radiusCircle, { backgroundColor: colors.background }]}>
          <Text style={[styles.radiusValue, { color: colors.text }]}>{displayValue}</Text>
          <Text style={[styles.radiusUnit, { color: colors.muted }]}>{unitLabel}</Text>
        </View>
        {postcode ? (
          <View style={styles.postcodeRow}>
            <Ionicons name="location" size={14} color={colors.tint} />
            <Text style={[styles.locationLabel, { color: colors.muted }]}>{locationLabel}</Text>
          </View>
        ) : (
          <Text style={[styles.locationLabel, { color: colors.muted }]}>{locationLabel}</Text>
        )}
      </View>

      {/* Slider */}
      <View style={styles.sliderArea}>
        <Slider
          style={styles.slider}
          minimumValue={MIN_RADIUS}
          maximumValue={MAX_RADIUS}
          step={1}
          value={localValue}
          onValueChange={handleSliderChange}
          minimumTrackTintColor={colors.tint}
          maximumTrackTintColor={colors.border}
          thumbTintColor={colors.tint}
          accessibilityLabel={`Travel radius: ${displayValue} ${unitLabel}`}
        />
        <View style={styles.sliderLabels}>
          <Text style={[styles.sliderLabel, { color: colors.muted }]}>{MIN_RADIUS} mi</Text>
          <Text style={[styles.sliderLabel, { color: colors.muted }]}>25 mi</Text>
          <Text style={[styles.sliderLabel, { color: colors.muted }]}>{MAX_RADIUS} mi</Text>
        </View>
      </View>

      {/* Quick-set presets */}
      <View style={styles.quickSetRow}>
        {QUICK_VALUES.map((val) => (
          <Pressable
            key={val}
            style={[
              styles.quickSetBtn,
              { backgroundColor: colors.surface, borderColor: colors.border },
              localValue === val ? { backgroundColor: colors.tint, borderColor: colors.tint } : undefined,
            ]}
            onPress={() => handleQuickSet(val)}
            accessibilityRole="button"
            accessibilityLabel={`Set radius to ${val} miles`}
          >
            <Text
              style={[
                styles.quickSetText,
                { color: colors.text },
                localValue === val ? { color: colors.surface } : undefined,
              ]}
            >
              {val} mi
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Helper text */}
      <View style={styles.helperArea}>
        <Ionicons name="information-circle-outline" size={16} color={colors.muted} />
        <Text style={[styles.helperText, { color: colors.muted }]}>
          Parents searching for coaches will only see you if they are within your travel
          radius. This does not apply to sessions at your own venue.
        </Text>
      </View>

      {/* Saved toast */}
      {saved && (
        <Animated.View style={[styles.toast, { backgroundColor: colors.surface }, Shadows[scheme].card, { opacity: toastOpacity }]} pointerEvents="none">
          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
          <Text style={[styles.toastText, { color: colors.success }]}>Saved</Text>
        </Animated.View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  title: {
    ...Typography.heading,
  },

  // Unit toggle
  unitToggle: {
    flexDirection: 'row',
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

  // Display area
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  locationLabel: {
    ...Typography.body,
  },

  // Slider
  sliderArea: {},
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xxs,
  },
  sliderLabel: {
    ...Typography.caption,
  },

  // Quick set
  quickSetRow: {
    flexDirection: 'row',
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

  // Helper
  helperArea: {
    flexDirection: 'row',
    gap: 8,
  },
  helperText: {
    flex: 1,
    ...Typography.small,
  },

  // Toast
  toast: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
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
