/**
 * TemplateDaySection — Day selection: presets, day chips, and selection summary.
 */
import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { DAYS, DAYS_SHORT, QUICK_PRESETS } from '@/hooks/use-recurring-template-form';
import { Row } from '@/components/primitives';

interface TemplateDaySectionProps {
  isEditing: boolean;
  isQuickAdd: boolean;
  preselectedDay?: number;
  selectedDays: number[];
  onToggleDay: (day: number) => void;
  onApplyPreset: (days: number[]) => void;
}

function TemplateDaySectionInner({
  isEditing, isQuickAdd, preselectedDay, selectedDays, onToggleDay, onApplyPreset,
}: TemplateDaySectionProps) {
  const { colors: palette } = useTheme();

  return (
    <View style={styles.section}>
      <ThemedText style={styles.sectionTitle}>
        {isEditing ? 'Day' : isQuickAdd ? 'Day' : 'Select Days'}
      </ThemedText>
      {!isEditing && !isQuickAdd && (
        <ThemedText style={[styles.sectionHint, { color: palette.muted }]}>
          Select multiple days to set the same hours
        </ThemedText>
      )}

      {isQuickAdd && preselectedDay !== undefined && (
        <Row style={[styles.quickAddDayLabel, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
          <Ionicons name="calendar-outline" size={16} color={palette.tint} />
          <ThemedText style={{ ...Typography.bodySemiBold, color: palette.tint }}>{DAYS[preselectedDay]}</ThemedText>
        </Row>
      )}

      {!isEditing && !isQuickAdd && (
        <Row style={styles.presetsRow}>
          {QUICK_PRESETS.map((preset) => {
            const isActive = preset.days.every(d => selectedDays.includes(d)) && selectedDays.every(d => preset.days.includes(d));
            return (
              <Clickable
                key={preset.id}
                onPress={() => onApplyPreset(preset.days)}
                style={[styles.presetChip, { backgroundColor: isActive ? palette.tint : palette.surface, borderColor: isActive ? palette.tint : palette.border }]}
              >
                <Ionicons name={preset.icon as keyof typeof Ionicons.glyphMap} size={14} color={isActive ? palette.onPrimary : palette.muted} />
                <ThemedText style={[styles.presetText, { color: isActive ? palette.onPrimary : palette.text }]}>{preset.label}</ThemedText>
              </Clickable>
            );
          })}
        </Row>
      )}

      {!isQuickAdd && (
        <Row style={styles.dayChipsRow}>
          {DAYS_SHORT.map((day, index) => {
            const isSelected = selectedDays.includes(index);
            const isWeekend = index === 0 || index === 6;
            return (
              <Clickable
                key={day}
                onPress={() => !isEditing && onToggleDay(index)}
                disabled={isEditing}
                style={[styles.dayChip, {
                  backgroundColor: isSelected ? palette.tint : palette.surface,
                  borderColor: isSelected ? palette.tint : isWeekend ? palette.warning : palette.border,
                  opacity: isEditing && !isSelected ? 0.4 : 1,
                }]}
              >
                <ThemedText style={[styles.dayChipText, { color: isSelected ? palette.onPrimary : palette.text }]}>{day}</ThemedText>
              </Clickable>
            );
          })}
        </Row>
      )}

      {!isEditing && !isQuickAdd && selectedDays.length > 0 && (
        <Row style={[styles.selectionSummary, { backgroundColor: withAlpha(palette.success, 0.06) }]}>
          <Ionicons name="checkmark-circle" size={16} color={palette.success} />
          <ThemedText style={{ ...Typography.small, color: palette.success }}>
            {selectedDays.length === 7
              ? 'Every day'
              : selectedDays.length === 1
              ? DAYS[selectedDays[0]]
              : `${selectedDays.length} days: ${selectedDays.map(d => DAYS_SHORT[d]).join(', ')}`}
          </ThemedText>
        </Row>
      )}
    </View>
  );
}

export const TemplateDaySection = memo(TemplateDaySectionInner);

const styles = StyleSheet.create({
  section: { gap: Spacing.sm },
  sectionTitle: { ...Typography.subheading },
  sectionHint: { ...Typography.small, marginBottom: Spacing.xs },
  quickAddDayLabel: { alignItems: 'center', gap: Spacing.xs, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm, borderRadius: Radii.md },
  presetsRow: { flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.sm },
  presetChip: { alignItems: 'center', gap: Spacing.xxs, paddingHorizontal: Spacing.sm, minHeight: 44, borderRadius: Radii.pill, borderWidth: 1 },
  presetText: { ...Typography.caption },
  dayChipsRow: { justifyContent: 'space-between', gap: Spacing.xs },
  dayChip: { width: 44, height: 44, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  dayChipText: { ...Typography.caption, fontWeight: '700' },
  selectionSummary: { alignItems: 'center', gap: Spacing.xs, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: Radii.md, marginTop: Spacing.xs },
});
