/**
 * SessionDatePicker — Date/time selection with platform-specific native pickers.
 */
import { memo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { scaleFont } from '@/utils/scale';

interface SessionDatePickerProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  showDatePicker: boolean;
  onShowDatePickerChange: (show: boolean) => void;
  showTimePicker: boolean;
  onShowTimePickerChange: (show: boolean) => void;
}

function SessionDatePickerInner({
  selectedDate,
  onDateChange,
  showDatePicker,
  onShowDatePickerChange,
  showTimePicker,
  onShowTimePickerChange,
}: SessionDatePickerProps) {
  const { colors: palette } = useTheme();

  const dateLabel = `${selectedDate.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })} at ${selectedDate.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })}`;

  return (
    <View style={styles.container}>
      <ThemedText style={styles.label}>Date & Time</ThemedText>
      <Clickable
        onPress={() => onShowDatePickerChange(true)}
        accessibilityLabel="Select date and time"
        style={[styles.dateButton, { backgroundColor: palette.card, borderColor: palette.border }]}
      >
        <Ionicons name="calendar-outline" size={20} color={palette.icon} />
        <ThemedText style={styles.dateText}>{dateLabel}</ThemedText>
      </Clickable>

      {Platform.OS === 'android' ? (
        <>
          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              onChange={(event, date) => {
                onShowDatePickerChange(false);
                if (date && event.type === 'set') {
                  const updated = new Date(date);
                  updated.setHours(selectedDate.getHours());
                  updated.setMinutes(selectedDate.getMinutes());
                  onDateChange(updated);
                  onShowTimePickerChange(true);
                }
              }}
            />
          )}
          {showTimePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="time"
              display="default"
              onChange={(event, date) => {
                onShowTimePickerChange(false);
                if (date && event.type === 'set') onDateChange(date);
              }}
            />
          )}
        </>
      ) : (
        <>
          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="datetime"
              display="default"
              onChange={(event, date) => {
                onShowDatePickerChange(Platform.OS === 'ios');
                if (date) onDateChange(date);
              }}
            />
          )}
        </>
      )}
    </View>
  );
}

export const SessionDatePicker = memo(SessionDatePickerInner);

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
  },
  label: {
    fontSize: scaleFont(15),
    fontWeight: '600',
    marginBottom: Spacing.xxs,
    letterSpacing: -0.2,
  },
  dateButton: {
    alignItems: 'center',
    gap: Spacing.xs + Spacing.xxs,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    minHeight: 44,
  },
  dateText: {
    fontSize: scaleFont(16),
  },
});
