/**
 * SeverityPicker Component
 *
 * Visual severity selector for injuries with color-coded options.
 */

import { View, StyleSheet, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { InjurySeverity } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';
import { scaleFont } from '@/utils/scale';

import { SEVERITY_OPTIONS, SeverityOptionCard, SeverityScale } from './severity-picker-sections';

// Re-export extracted components for backward compat
export { SEVERITY_OPTIONS, SeverityOptionCard, SeverityScale } from './severity-picker-sections';
export type {
  SeverityOption,
  SeverityOptionCardProps,
  SeverityScaleProps,
} from './severity-picker-sections';

interface SeverityPickerProps {
  selectedSeverity: InjurySeverity | null;
  onSelect: (severity: InjurySeverity) => void;
}

export function SeverityPicker({ selectedSeverity, onSelect }: SeverityPickerProps) {
  const { colors: palette } = useTheme();

  const handleSelect = (severity: InjurySeverity) => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelect(severity);
  };

  return (
    <View style={styles.container}>
      <ThemedText style={[styles.sectionTitle, { color: palette.muted }]}>
        Severity Level
      </ThemedText>

      <View style={styles.optionsContainer}>
        {SEVERITY_OPTIONS.map((option) => (
          <SeverityOptionCard
            key={option.value}
            option={option}
            isSelected={selectedSeverity === option.value}
            onSelect={() => handleSelect(option.value)}
            palette={palette}
          />
        ))}
      </View>

      <SeverityScale selectedSeverity={selectedSeverity} palette={palette} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  sectionTitle: {
    fontSize: scaleFont(13),
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionsContainer: {
    gap: Spacing.sm,
  },
});
