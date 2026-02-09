/**
 * TemplateTimeSection — Time range picker with duration badge.
 */
import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { DateTimeField } from '@/components/ui/primitives/DateTimeField';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { DAYS } from '@/hooks/use-recurring-template-form';

interface TemplateTimeSectionProps {
  isEditing: boolean;
  selectedDays: number[];
  startTime: string;
  endTime: string;
  duration: string | null;
  onStartTimeChange: (time: string) => void;
  onEndTimeChange: (time: string) => void;
}

function TemplateTimeSectionInner({
  isEditing, selectedDays, startTime, endTime, duration, onStartTimeChange, onEndTimeChange,
}: TemplateTimeSectionProps) {
  const { colors: palette } = useTheme();

  return (
    <View style={styles.section}>
      <ThemedText style={styles.sectionTitle}>Time Range</ThemedText>
      <ThemedText style={[styles.sectionHint, { color: palette.muted }]}>
        {isEditing
          ? `Set your available hours for ${DAYS[selectedDays[0]]}`
          : `Same hours will apply to all ${selectedDays.length} selected day${selectedDays.length > 1 ? 's' : ''}`}
      </ThemedText>

      <View style={styles.timeRow}>
        <DateTimeField mode="time" label="Start Time" value={startTime} onChange={onStartTimeChange} minuteInterval={15} style={{ flex: 1 }} />
        <View style={styles.timeArrow}>
          <Ionicons name="arrow-forward" size={20} color={palette.muted} />
        </View>
        <DateTimeField mode="time" label="End Time" value={endTime} onChange={onEndTimeChange} minuteInterval={15} style={{ flex: 1 }} />
      </View>

      {duration && (
        <View style={[styles.durationBadge, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
          <Ionicons name="time-outline" size={16} color={palette.success} />
          <ThemedText style={{ ...Typography.bodySemiBold, color: palette.success }}>
            {duration} availability {!isEditing && selectedDays.length > 1 && `× ${selectedDays.length} days`}
          </ThemedText>
        </View>
      )}
    </View>
  );
}

export const TemplateTimeSection = memo(TemplateTimeSectionInner);

const styles = StyleSheet.create({
  section: { gap: Spacing.sm },
  sectionTitle: { ...Typography.subheading },
  sectionHint: { ...Typography.small, marginBottom: Spacing.xs },
  timeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm },
  timeArrow: { paddingBottom: Spacing.sm },
  durationBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: Radii.md, marginTop: Spacing.xs },
});
