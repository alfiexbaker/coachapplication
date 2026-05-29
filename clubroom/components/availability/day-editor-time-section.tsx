import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { DateTimeField } from '@/components/ui/primitives/DateTimeField';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';

interface DayEditorTimeSectionProps {
  startTime: string;
  endTime: string;
  isValid: boolean;
  durationLabel: string | null;
  overlapWarning: string | null;
  onStartTimeChange: (time: string) => void;
  onEndTimeChange: (time: string) => void;
}

function DayEditorTimeSectionInner({
  startTime,
  endTime,
  isValid,
  durationLabel,
  overlapWarning,
  onStartTimeChange,
  onEndTimeChange,
}: DayEditorTimeSectionProps) {
  const { colors: palette } = useTheme();

  return (
    <View style={styles.section}>
      <ThemedText style={[styles.sectionLabel, { color: palette.muted }]}>Time Range</ThemedText>
      <Row style={styles.timeRow}>
        <DateTimeField
          mode="time"
          label="Start"
          value={startTime}
          onChange={onStartTimeChange}
          minuteInterval={15}
          style={{ flex: 1 }}
        />
        <View style={styles.timeArrow}>
          <Ionicons name="arrow-forward" size={16} color={palette.muted} />
        </View>
        <DateTimeField
          mode="time"
          label="End"
          value={endTime}
          onChange={onEndTimeChange}
          minuteInterval={15}
          style={{ flex: 1 }}
        />
      </Row>
      {durationLabel && isValid && (
        <Row style={[styles.durationBadge, { backgroundColor: withAlpha(palette.success, 0.08) }]}>
          <Ionicons name="time-outline" size={14} color={palette.success} />
          <ThemedText style={[styles.durationText, { color: palette.success }]}>
            {durationLabel}
          </ThemedText>
        </Row>
      )}
      {!isValid && (
        <ThemedText style={[styles.errorText, { color: palette.error }]}>
          End time must be after start time
        </ThemedText>
      )}
      {isValid && overlapWarning && (
        <Row style={[styles.overlapWarning, { backgroundColor: withAlpha(palette.warning, 0.08) }]}>
          <Ionicons name="warning-outline" size={14} color={palette.warning} />
          <ThemedText style={[styles.overlapText, { color: palette.warning }]}>
            {overlapWarning}
          </ThemedText>
        </Row>
      )}
    </View>
  );
}

export const DayEditorTimeSection = DayEditorTimeSectionInner;

const styles = StyleSheet.create({
  section: { gap: Spacing.sm },
  sectionLabel: { ...Typography.caption, textTransform: 'uppercase', letterSpacing: 0.5 },
  timeRow: { alignItems: 'flex-end', gap: Spacing.xs },
  timeArrow: { paddingBottom: Spacing.sm },
  durationBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxs,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.md,
  },
  durationText: { ...Typography.smallSemiBold },
  errorText: { ...Typography.small },
  overlapWarning: {
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.md,
  },
  overlapText: { ...Typography.small, flex: 1 },
});
