import { StyleSheet, View, Platform } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

import { Radii, Spacing, Typography } from '@/constants/theme';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { FrequencyPicker } from './FrequencyPicker';
import { useTheme } from '@/hooks/useTheme';
import { DAYS, formatTime } from '@/hooks/use-subscribe-form';
import type { RecurrenceFrequency } from '@/constants/types';

interface Props {
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  onDayChange: (day: 0 | 1 | 2 | 3 | 4 | 5 | 6) => void;
  time: string;
  showTimePicker: boolean;
  onShowTimePicker: (show: boolean) => void;
  timeDate: Date;
  onTimeChange: (event: unknown, date?: Date) => void;
  frequency: RecurrenceFrequency;
  onFrequencyChange: (freq: RecurrenceFrequency) => void;
  pricePerSession?: number;
}

function SubscribeScheduleSectionInner({
  dayOfWeek,
  onDayChange,
  time,
  showTimePicker,
  onShowTimePicker,
  timeDate,
  onTimeChange,
  frequency,
  onFrequencyChange,
  pricePerSession,
}: Props) {
  const { colors: palette, isDark } = useTheme();

  return (
    <>
      {/* Day Selector */}
      <View style={styles.section}>
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          Day of Week
        </ThemedText>
        <Row gap="xs">
          {DAYS.map((day) => {
            const isSelected = dayOfWeek === day.value;
            return (
              <Clickable
                key={day.value}
                onPress={() => onDayChange(day.value)}
                style={[
                  styles.dayOption,
                  {
                    backgroundColor: isSelected ? palette.tint : palette.surface,
                    borderColor: isSelected ? palette.tint : palette.border,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.dayLabel,
                    { color: isSelected ? palette.onPrimary : palette.foreground },
                  ]}
                >
                  {day.shortLabel}
                </ThemedText>
              </Clickable>
            );
          })}
        </Row>
      </View>

      {/* Time Selector */}
      <View style={styles.section}>
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          Time
        </ThemedText>
        <Clickable
          onPress={() => onShowTimePicker(true)}
          style={[
            styles.timeSelector,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          <Ionicons name="time-outline" size={20} color={palette.icon} />
          <ThemedText style={styles.timeText}>{formatTime(time)}</ThemedText>
          <Ionicons name="chevron-down" size={16} color={palette.muted} />
        </Clickable>
        {showTimePicker && (
          <DateTimePicker
            value={timeDate}
            mode="time"
            is24Hour={false}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            textColor={palette.text}
            themeVariant={isDark ? 'dark' : 'light'}
            onChange={onTimeChange}
          />
        )}
      </View>

      {/* Frequency Selector */}
      <View style={styles.section}>
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          Frequency
        </ThemedText>
        <FrequencyPicker
          value={frequency}
          onChange={onFrequencyChange}
          pricePerSession={pricePerSession}
        />
      </View>
    </>
  );
}

export const SubscribeScheduleSection = SubscribeScheduleSectionInner;

const styles = StyleSheet.create({
  section: { gap: Spacing.sm },
  sectionTitle: { marginBottom: Spacing.xxs },
  dayOption: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  dayLabel: { ...Typography.smallSemiBold },
  timeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  timeText: { flex: 1, ...Typography.body },
});
