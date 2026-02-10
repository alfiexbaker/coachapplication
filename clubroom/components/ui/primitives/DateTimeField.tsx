/**
 * DateTimeField Primitive
 *
 * Native date/time picker that matches the Input primitive look.
 * Wraps @react-native-community/datetimepicker with iOS spinner modal
 * and Android native dialog. Displays en-GB formatted values.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

import { Components } from '@/constants/theme';
import { Row } from '@/components/primitives/row';
import { useTheme } from '@/hooks/useTheme';
import { toDateStr } from '@/utils/format';

import {
  parseDateValue,
  parseTimeValue,
  formatTimeString,
  displayDate,
  displayTime,
  IOSPickerModal,
  styles,
} from './date-time-field-sections';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DateTimeFieldProps {
  mode: 'date' | 'time';
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  minuteInterval?: 1 | 2 | 3 | 4 | 5 | 6 | 10 | 12 | 15 | 20 | 30;
  disabled?: boolean;
  error?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

function DateTimeFieldInner({
  mode,
  value,
  onChange,
  label,
  placeholder,
  minimumDate,
  maximumDate,
  minuteInterval,
  disabled = false,
  error,
  style,
  testID,
}: DateTimeFieldProps) {
  const { colors } = useTheme();
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date | null>(null);

  const currentDate = mode === 'date' ? parseDateValue(value) : parseTimeValue(value);
  const displayValue = mode === 'date' ? displayDate(value) : displayTime(value);
  const icon: keyof typeof Ionicons.glyphMap =
    mode === 'date' ? 'calendar-outline' : 'time-outline';
  const defaultPlaceholder = mode === 'date' ? 'Select date' : 'Select time';

  const hasError = Boolean(error);
  const borderColor = hasError ? colors.error : colors.border;

  const handlePress = useCallback(() => {
    if (disabled) return;
    setTempDate(currentDate);
    setShowPicker(true);
  }, [disabled, currentDate]);

  const handleChange = useCallback(
    (_event: DateTimePickerEvent, selected?: Date) => {
      if (Platform.OS === 'android') {
        setShowPicker(false);
        if (_event.type === 'set' && selected) {
          onChange(mode === 'date' ? toDateStr(selected) : formatTimeString(selected));
        }
      } else {
        if (selected) setTempDate(selected);
      }
    },
    [mode, onChange],
  );

  const handleIOSDone = useCallback(() => {
    setShowPicker(false);
    if (tempDate) {
      onChange(mode === 'date' ? toDateStr(tempDate) : formatTimeString(tempDate));
    }
  }, [mode, onChange, tempDate]);

  const handleIOSCancel = useCallback(() => {
    setShowPicker(false);
    setTempDate(null);
  }, []);

  const themedStyles = useMemo(
    () => ({
      button: { backgroundColor: colors.surface },
      disabled: { backgroundColor: colors.surfaceSecondary, opacity: 0.6 },
      text: { color: colors.text },
      placeholder: { color: colors.muted },
    }),
    [colors],
  );

  return (
    <View style={[styles.container, style]}>
      {label ? (
        <Text style={[styles.label, { color: colors.muted }]}>{label}</Text>
      ) : null}

      <Pressable
        testID={testID}
        onPress={handlePress}
        style={[
          styles.button,
          themedStyles.button,
          { borderColor },
          disabled ? themedStyles.disabled : undefined,
        ]}
      >
        <Row align="center" gap="xs" flex>
          <Ionicons name={icon} size={Components.icon.md} color={colors.muted} />
          <Text
            style={[
              styles.valueText,
              displayValue ? themedStyles.text : themedStyles.placeholder,
            ]}
          >
            {displayValue || placeholder || defaultPlaceholder}
          </Text>
        </Row>
      </Pressable>

      {hasError ? (
        <Text style={[styles.helperBase, { color: colors.error }]}>{error}</Text>
      ) : null}

      {Platform.OS === 'ios' && (
        <IOSPickerModal
          visible={showPicker}
          mode={mode}
          tempDate={tempDate}
          currentDate={currentDate}
          onChange={handleChange}
          onDone={handleIOSDone}
          onCancel={handleIOSCancel}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          minuteInterval={minuteInterval}
          colors={colors}
        />
      )}

      {Platform.OS === 'android' && showPicker ? (
        <DateTimePicker
          value={currentDate}
          mode={mode}
          display="default"
          onChange={handleChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          minuteInterval={minuteInterval}
          is24Hour
        />
      ) : null}
    </View>
  );
}

export const DateTimeField = React.memo(DateTimeFieldInner);
