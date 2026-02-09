/**
 * WizardStepDays — Step 1: Select coaching days with preset buttons.
 */
import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { DAYS_SHORT } from '@/hooks/use-availability-wizard';

interface WizardStepDaysProps {
  selectedDays: boolean[];
  selectedCount: number;
  onToggleDay: (index: number) => void;
  onApplyPreset: (preset: 'weekdays' | 'weekends') => void;
  onNext: () => void;
}

function WizardStepDaysInner({ selectedDays, selectedCount, onToggleDay, onApplyPreset, onNext }: WizardStepDaysProps) {
  const { colors: palette } = useTheme();

  return (
    <>
      <View style={styles.stepHeader}>
        <View style={[styles.stepBadge, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
          <ThemedText style={[styles.stepBadgeText, { color: palette.tint }]}>Step 1 of 3</ThemedText>
        </View>
        <ThemedText type="subtitle" style={styles.stepTitle}>Which days do you coach?</ThemedText>
        <ThemedText style={[styles.stepSubtitle, { color: palette.muted }]}>
          Select the days you want to be available for bookings
        </ThemedText>
      </View>

      <View style={styles.presetRow}>
        <Clickable onPress={() => onApplyPreset('weekdays')} style={[styles.presetBtn, { borderColor: palette.border }]}>
          <ThemedText style={[styles.presetText, { color: palette.tint }]}>Weekdays</ThemedText>
        </Clickable>
        <Clickable onPress={() => onApplyPreset('weekends')} style={[styles.presetBtn, { borderColor: palette.border }]}>
          <ThemedText style={[styles.presetText, { color: palette.tint }]}>Weekends</ThemedText>
        </Clickable>
      </View>

      <View style={styles.dayGrid}>
        {DAYS_SHORT.map((day, index) => (
          <Clickable
            key={day}
            onPress={() => onToggleDay(index)}
            accessibilityLabel={`${day} ${selectedDays[index] ? 'selected' : 'not selected'}`}
            style={[
              styles.dayCell,
              {
                backgroundColor: selectedDays[index] ? palette.tint : palette.background,
                borderColor: selectedDays[index] ? palette.tint : palette.border,
              },
            ]}
          >
            <ThemedText style={[styles.dayCellText, { color: selectedDays[index] ? palette.onPrimary : palette.text }]}>
              {day}
            </ThemedText>
          </Clickable>
        ))}
      </View>

      <Clickable
        onPress={() => selectedCount > 0 && onNext()}
        accessibilityLabel={`Continue with ${selectedCount} days selected`}
        style={[styles.nextBtn, { backgroundColor: selectedCount > 0 ? palette.tint : palette.border }]}
      >
        <ThemedText style={[styles.nextBtnText, { color: palette.onPrimary }]}>
          Continue ({selectedCount} day{selectedCount !== 1 ? 's' : ''})
        </ThemedText>
        <Ionicons name="arrow-forward" size={18} color={palette.onPrimary} />
      </Clickable>
    </>
  );
}

export const WizardStepDays = memo(WizardStepDaysInner);

const styles = StyleSheet.create({
  stepHeader: { gap: Spacing.xs },
  stepBadge: { alignSelf: 'flex-start', paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xxs, borderRadius: Radii.pill },
  stepBadgeText: { ...Typography.caption, fontWeight: '600' },
  stepTitle: { marginTop: Spacing.xs },
  stepSubtitle: { ...Typography.body },
  presetRow: { flexDirection: 'row', gap: Spacing.sm },
  presetBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radii.md, borderWidth: 1, minHeight: 44 },
  presetText: { ...Typography.smallSemiBold },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  dayCell: { width: '13%', minWidth: 42, aspectRatio: 1, borderRadius: Radii.md, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  dayCellText: { ...Typography.smallSemiBold },
  nextBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: Spacing.md, borderRadius: Radii.md, minHeight: 52 },
  nextBtnText: { fontWeight: '600', fontSize: Typography.body.fontSize },
});
