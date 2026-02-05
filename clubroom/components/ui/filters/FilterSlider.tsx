/**
 * FilterSlider - Range slider for numeric filter values.
 *
 * Displays current value with optional unit suffix.
 * Supports preset quick-select buttons.
 */

import { View, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';

import { ThemedText } from '@/components/themed-text';
import { FilterChip } from './FilterChip';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export interface FilterSliderProps {
  /** Current value */
  value: number;
  /** Value change handler */
  onChange: (value: number) => void;
  /** Minimum value */
  min: number;
  /** Maximum value */
  max: number;
  /** Step increment (default: 1) */
  step?: number;
  /** Unit suffix for display (e.g., "mi", "£") */
  unit?: string;
  /** Unit prefix (e.g., "£" for currency) */
  unitPrefix?: string;
  /** Format value for display */
  formatValue?: (value: number) => string;
  /** Preset values for quick selection */
  presets?: number[];
  /** Show current value label (default: true) */
  showValue?: boolean;
}

export function FilterSlider({
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  unitPrefix,
  formatValue,
  presets,
  showValue = true,
}: FilterSliderProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const displayValue = formatValue
    ? formatValue(value)
    : `${unitPrefix || ''}${value}${unit ? ` ${unit}` : ''}`;

  return (
    <View style={styles.container}>
      <Slider
        style={styles.slider}
        minimumValue={min}
        maximumValue={max}
        step={step}
        value={value}
        minimumTrackTintColor={palette.tint}
        maximumTrackTintColor={palette.border}
        thumbTintColor={palette.tint}
        onValueChange={onChange}
      />

      {showValue && (
        <ThemedText style={[styles.value, { color: palette.muted }]}>
          {displayValue}
        </ThemedText>
      )}

      {presets && presets.length > 0 && (
        <View style={styles.presets}>
          {presets.map((preset) => (
            <FilterChip
              key={preset}
              label={`${unitPrefix || ''}${preset}${unit ? ` ${unit}` : ''}`}
              active={value === preset}
              onPress={() => onChange(preset)}
              size="sm"
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  value: {
    ...Typography.small,
    textAlign: 'center',
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
});
