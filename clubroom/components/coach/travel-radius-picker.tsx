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
import { Colors, Spacing, Radii, Typography, Shadows, Components } from '@/constants/theme';
import { CardStyles, LayoutStyles } from '@/constants/styles';

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
    <View style={[CardStyles.base, styles.container]}>
      {/* Header + unit toggle */}
      <View style={LayoutStyles.rowBetween}>
        <Text style={styles.title}>Travel Radius</Text>
        <View style={styles.unitToggle}>
          <Pressable
            style={[styles.unitButton, unit === 'miles' && styles.unitButtonActive]}
            onPress={() => setUnit('miles')}
            accessibilityRole="button"
            accessibilityLabel="Switch to miles"
          >
            <Text
              style={[styles.unitButtonText, unit === 'miles' && styles.unitButtonTextActive]}
            >
              mi
            </Text>
          </Pressable>
          <Pressable
            style={[styles.unitButton, unit === 'km' && styles.unitButtonActive]}
            onPress={() => setUnit('km')}
            accessibilityRole="button"
            accessibilityLabel="Switch to kilometres"
          >
            <Text
              style={[styles.unitButtonText, unit === 'km' && styles.unitButtonTextActive]}
            >
              km
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Large value display */}
      <View style={styles.displayArea}>
        <View style={styles.radiusCircle}>
          <Text style={styles.radiusValue}>{displayValue}</Text>
          <Text style={styles.radiusUnit}>{unitLabel}</Text>
        </View>
        {postcode ? (
          <View style={styles.postcodeRow}>
            <Ionicons name="location" size={14} color={Colors.light.tint} />
            <Text style={styles.locationLabel}>{locationLabel}</Text>
          </View>
        ) : (
          <Text style={styles.locationLabel}>{locationLabel}</Text>
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
          minimumTrackTintColor={Colors.light.tint}
          maximumTrackTintColor={Colors.light.border}
          thumbTintColor={Colors.light.tint}
          accessibilityLabel={`Travel radius: ${displayValue} ${unitLabel}`}
        />
        <View style={styles.sliderLabels}>
          <Text style={styles.sliderLabel}>{MIN_RADIUS} mi</Text>
          <Text style={styles.sliderLabel}>25 mi</Text>
          <Text style={styles.sliderLabel}>{MAX_RADIUS} mi</Text>
        </View>
      </View>

      {/* Quick-set presets */}
      <View style={styles.quickSetRow}>
        {QUICK_VALUES.map((val) => (
          <Pressable
            key={val}
            style={[styles.quickSetBtn, localValue === val && styles.quickSetBtnActive]}
            onPress={() => handleQuickSet(val)}
            accessibilityRole="button"
            accessibilityLabel={`Set radius to ${val} miles`}
          >
            <Text
              style={[styles.quickSetText, localValue === val && styles.quickSetTextActive]}
            >
              {val} mi
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Helper text */}
      <View style={styles.helperArea}>
        <Ionicons name="information-circle-outline" size={16} color={Colors.light.muted} />
        <Text style={styles.helperText}>
          Parents searching for coaches will only see you if they are within your travel
          radius. This does not apply to sessions at your own venue.
        </Text>
      </View>

      {/* Saved toast */}
      {saved && (
        <Animated.View style={[styles.toast, { opacity: toastOpacity }]} pointerEvents="none">
          <Ionicons name="checkmark-circle" size={18} color={Colors.light.success} />
          <Text style={styles.toastText}>Saved</Text>
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
    color: Colors.light.text,
  },

  // Unit toggle
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.light.background,
    borderRadius: Radii.pill,
    padding: 2,
  },
  unitButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radii.pill,
  },
  unitButtonActive: {
    backgroundColor: Colors.light.tint,
  },
  unitButtonText: {
    ...Typography.caption,
    color: Colors.light.muted,
  },
  unitButtonTextActive: {
    color: '#FFFFFF',
  },

  // Display area
  displayArea: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  radiusCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.light.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  radiusValue: {
    ...Typography.display,
    fontSize: 36,
    color: Colors.light.text,
  },
  radiusUnit: {
    ...Typography.caption,
    color: Colors.light.muted,
    marginTop: -4,
  },
  postcodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationLabel: {
    ...Typography.body,
    color: Colors.light.muted,
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
    paddingHorizontal: 4,
  },
  sliderLabel: {
    ...Typography.caption,
    color: Colors.light.muted,
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
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  quickSetBtnActive: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint,
  },
  quickSetText: {
    ...Typography.small,
    fontWeight: '600',
    color: Colors.light.text,
  },
  quickSetTextActive: {
    color: Colors.light.surface,
  },

  // Helper
  helperArea: {
    flexDirection: 'row',
    gap: 8,
  },
  helperText: {
    flex: 1,
    ...Typography.small,
    color: Colors.light.muted,
  },

  // Toast
  toast: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.light.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    ...Shadows.light.card,
  },
  toastText: {
    ...Typography.bodySemiBold,
    color: Colors.light.success,
  },
});
