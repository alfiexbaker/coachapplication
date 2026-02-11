/**
 * QuietHoursSelector Component
 *
 * A time range picker for configuring notification quiet hours.
 * Allows users to set a start and end time during which push notifications are suppressed.
 */

import { useState, useCallback } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { QuietHours } from '@/constants/types';
import {
  parseTimeToDate,
  formatDateToTime,
  QuietHoursHeader,
  TimeRangeSection,
  TimePickerModal,
} from './quiet-hours-sections';

export interface QuietHoursSelectorProps {
  value: QuietHours;
  onChange: (quietHours: QuietHours) => void;
  disabled?: boolean;
  loading?: boolean;
}

export function QuietHoursSelector({
  value,
  onChange,
  disabled = false,
  loading = false,
}: QuietHoursSelectorProps) {
  const { colors: palette } = useTheme();

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [tempTime, setTempTime] = useState<Date | null>(null);

  const handleToggle = useCallback(() => {
    onChange({ ...value, enabled: !value.enabled });
  }, [value, onChange]);

  const handleStartTimeChange = useCallback(
    (_event: unknown, selectedDate?: Date) => {
      if (Platform.OS === 'android') setShowStartPicker(false);
      if (selectedDate) {
        if (Platform.OS === 'ios') {
          setTempTime(selectedDate);
        } else {
          onChange({ ...value, startTime: formatDateToTime(selectedDate) });
        }
      }
    },
    [value, onChange],
  );

  const handleEndTimeChange = useCallback(
    (_event: unknown, selectedDate?: Date) => {
      if (Platform.OS === 'android') setShowEndPicker(false);
      if (selectedDate) {
        if (Platform.OS === 'ios') {
          setTempTime(selectedDate);
        } else {
          onChange({ ...value, endTime: formatDateToTime(selectedDate) });
        }
      }
    },
    [value, onChange],
  );

  const handleConfirmStartTime = useCallback(() => {
    if (tempTime) onChange({ ...value, startTime: formatDateToTime(tempTime) });
    setTempTime(null);
    setShowStartPicker(false);
  }, [tempTime, value, onChange]);

  const handleConfirmEndTime = useCallback(() => {
    if (tempTime) onChange({ ...value, endTime: formatDateToTime(tempTime) });
    setTempTime(null);
    setShowEndPicker(false);
  }, [tempTime, value, onChange]);

  const handleCancelPicker = useCallback(() => {
    setTempTime(null);
    setShowStartPicker(false);
    setShowEndPicker(false);
  }, []);

  const isDisabled = disabled || loading;

  return (
    <View
      style={[styles.container, { backgroundColor: palette.card, borderColor: palette.border }]}
    >
      <QuietHoursHeader
        enabled={value.enabled}
        disabled={isDisabled}
        onToggle={handleToggle}
        palette={palette}
      />

      {value.enabled && (
        <TimeRangeSection
          startTime={value.startTime}
          endTime={value.endTime}
          disabled={isDisabled}
          onStartPress={() => {
            setTempTime(parseTimeToDate(value.startTime));
            setShowStartPicker(true);
          }}
          onEndPress={() => {
            setTempTime(parseTimeToDate(value.endTime));
            setShowEndPicker(true);
          }}
          palette={palette}
        />
      )}

      {/* iOS Time Picker Modal */}
      <TimePickerModal
        visible={showStartPicker}
        title="Start Time"
        value={tempTime || parseTimeToDate(value.startTime)}
        onChange={handleStartTimeChange}
        onConfirm={handleConfirmStartTime}
        onCancel={handleCancelPicker}
        palette={palette}
      />
      <TimePickerModal
        visible={showEndPicker}
        title="End Time"
        value={tempTime || parseTimeToDate(value.endTime)}
        onChange={handleEndTimeChange}
        onConfirm={handleConfirmEndTime}
        onCancel={handleCancelPicker}
        palette={palette}
      />

      {/* Android Time Pickers */}
      {Platform.OS === 'android' && showStartPicker && (
        <DateTimePicker
          value={parseTimeToDate(value.startTime)}
          mode="time"
          display="default"
          onChange={handleStartTimeChange}
          minuteInterval={15}
        />
      )}
      {Platform.OS === 'android' && showEndPicker && (
        <DateTimePicker
          value={parseTimeToDate(value.endTime)}
          mode="time"
          display="default"
          onChange={handleEndTimeChange}
          minuteInterval={15}
        />
      )}
    </View>
  );
}

export default QuietHoursSelector;

const styles = StyleSheet.create({
  container: {
    borderRadius: Radii.lg,
    borderWidth: 0.75,
    overflow: 'hidden',
  },
});
