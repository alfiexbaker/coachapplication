/**
 * Travel Radius Picker
 *
 * Slider-based picker for setting how far a coach is willing to travel.
 * Displays "Within X miles of [postcode]" with a miles/km toggle.
 * Save is debounced to avoid excessive writes.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text } from 'react-native';
import { useSharedValue, withSequence, withTiming, withDelay, runOnJS } from 'react-native-reanimated';
import { Shadows } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { createCardStyles, LayoutStyles } from '@/constants/styles';

import {
  MIN_RADIUS,
  MAX_RADIUS,
  MILES_TO_KM,
  DEBOUNCE_MS,
  UnitToggle,
  RadiusDisplay,
  RadiusSlider,
  QuickSetRow,
  RadiusHelperText,
  SavedToast,
  styles,
} from './travel-radius-picker-sections';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TravelRadiusPickerProps {
  value: number;
  onChange: (miles: number) => void;
  postcode?: string;
}

type DistanceUnit = 'miles' | 'km';

// ─── Component ────────────────────────────────────────────────────────────────

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

  const toastOpacity = useSharedValue(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const flashSaved = useCallback(() => {
    setSaved(true);
    toastOpacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withDelay(1200, withTiming(0, { duration: 300 }, (finished) => {
        if (finished) runOnJS(setSaved)(false);
      })),
    );
  }, [toastOpacity]);

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

  const handleSetMiles = useCallback(() => setUnit('miles'), []);
  const handleSetKm = useCallback(() => setUnit('km'), []);

  const displayValue =
    unit === 'miles' ? localValue : Math.round(localValue * MILES_TO_KM);
  const unitLabel = unit === 'miles' ? (localValue === 1 ? 'mile' : 'miles') : 'km';
  const locationLabel = postcode
    ? `Within ${displayValue} ${unitLabel} of ${postcode}`
    : `Within ${displayValue} ${unitLabel}`;

  return (
    <View style={[CardStyles.base, Shadows[scheme].card, styles.container]}>
      <View style={LayoutStyles.rowBetween}>
        <Text style={[styles.title, { color: colors.text }]}>Travel Radius</Text>
        <UnitToggle unit={unit} onSetMiles={handleSetMiles} onSetKm={handleSetKm} palette={colors} />
      </View>

      <RadiusDisplay
        displayValue={displayValue}
        unitLabel={unitLabel}
        locationLabel={locationLabel}
        postcode={postcode}
        palette={colors}
      />

      <RadiusSlider
        localValue={localValue}
        displayValue={displayValue}
        unitLabel={unitLabel}
        onValueChange={handleSliderChange}
        palette={colors}
      />

      <QuickSetRow localValue={localValue} onQuickSet={handleQuickSet} palette={colors} />
      <RadiusHelperText palette={colors} />
      <SavedToast visible={saved} toastOpacity={toastOpacity} palette={colors} scheme={scheme} />
    </View>
  );
}
