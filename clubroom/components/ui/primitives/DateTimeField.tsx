/**
 * DateTimeField Primitive
 *
 * Native date/time picker that matches the Input primitive look.
 * Wraps @react-native-community/datetimepicker with iOS spinner modal
 * and Android native dialog. Displays en-GB formatted values.
 *
 * Values are strings: `YYYY-MM-DD` for dates, `HH:mm` for times —
 * matching all existing state patterns across the app.
 *
 * Usage:
 *   <DateTimeField mode="date" label="Date" value={date} onChange={setDate} />
 *   <DateTimeField mode="time" label="Start Time" value={time} onChange={setTime} minuteInterval={15} />
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

import { Components, Fonts, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DateTimeFieldProps {
  /** Whether to show a date or time picker */
  mode: 'date' | 'time';
  /** Current value — `YYYY-MM-DD` for dates, `HH:mm` for times */
  value: string;
  /** Called with the new string value in the same format */
  onChange: (value: string) => void;
  /** Field label displayed above the input */
  label?: string;
  /** Placeholder shown when value is empty */
  placeholder?: string;
  /** Earliest selectable date (date mode only) */
  minimumDate?: Date;
  /** Latest selectable date (date mode only) */
  maximumDate?: Date;
  /** Minute interval for time picker (e.g. 15) */
  minuteInterval?: 1 | 2 | 3 | 4 | 5 | 6 | 10 | 12 | 15 | 20 | 30;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Error message — triggers error styling when truthy */
  error?: string;
  /** Additional container style */
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse `YYYY-MM-DD` into a Date, fallback to today */
function parseDateValue(value: string): Date {
  if (!value) return new Date();
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

/** Parse `HH:mm` into a Date (today with that time), fallback to now */
function parseTimeValue(value: string): Date {
  if (!value) return new Date();
  const [h, m] = value.split(':').map(Number);
  if (h == null || m == null || isNaN(h) || isNaN(m)) return new Date();
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

/** Format Date → `YYYY-MM-DD` */
function formatDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Format Date → `HH:mm` */
function formatTimeString(d: Date): string {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/** Display-friendly en-GB date: `15 Jan 2026` */
function displayDate(value: string): string {
  if (!value) return '';
  const d = parseDateValue(value);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Display-friendly 24hr time: `16:00` */
function displayTime(value: string): string {
  if (!value) return '';
  return value; // Already HH:mm
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

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
  // iOS: track interim value before Done is pressed
  const [tempDate, setTempDate] = useState<Date | null>(null);

  const currentDate = mode === 'date' ? parseDateValue(value) : parseTimeValue(value);
  const displayValue =
    mode === 'date' ? displayDate(value) : displayTime(value);
  const icon: keyof typeof Ionicons.glyphMap =
    mode === 'date' ? 'calendar-outline' : 'time-outline';
  const defaultPlaceholder =
    mode === 'date' ? 'Select date' : 'Select time';

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
        // Android fires once then closes
        setShowPicker(false);
        if (_event.type === 'set' && selected) {
          onChange(
            mode === 'date'
              ? formatDateString(selected)
              : formatTimeString(selected),
          );
        }
      } else {
        // iOS: update temp value while spinner is open
        if (selected) {
          setTempDate(selected);
        }
      }
    },
    [mode, onChange],
  );

  const handleIOSDone = useCallback(() => {
    setShowPicker(false);
    if (tempDate) {
      onChange(
        mode === 'date'
          ? formatDateString(tempDate)
          : formatTimeString(tempDate),
      );
    }
  }, [mode, onChange, tempDate]);

  const handleIOSCancel = useCallback(() => {
    setShowPicker(false);
    setTempDate(null);
  }, []);

  const themedStyles = useMemo(
    () => ({
      label: { color: colors.muted },
      button: {
        backgroundColor: colors.surface,
      },
      disabled: {
        backgroundColor: colors.surfaceSecondary,
        opacity: 0.6,
      },
      text: { color: colors.text },
      placeholder: { color: colors.muted },
      error: { color: colors.error },
      modalOverlay: { backgroundColor: 'rgba(0,0,0,0.4)' },
      modalContent: { backgroundColor: colors.surface },
      modalButton: { color: colors.tint },
      cancelButton: { color: colors.muted },
    }),
    [colors],
  );

  return (
    <View style={[styles.container, style]}>
      {label ? (
        <Text style={[styles.label, themedStyles.label]}>{label}</Text>
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
        <Ionicons
          name={icon}
          size={Components.icon.md}
          color={colors.muted}
        />
        <Text
          style={[
            styles.valueText,
            displayValue ? themedStyles.text : themedStyles.placeholder,
          ]}
        >
          {displayValue || placeholder || defaultPlaceholder}
        </Text>
      </Pressable>

      {hasError ? (
        <Text style={[styles.helperBase, themedStyles.error]}>{error}</Text>
      ) : null}

      {/* iOS: modal with spinner + Done/Cancel */}
      {Platform.OS === 'ios' && showPicker ? (
        <Modal transparent animationType="slide">
          <Pressable
            style={[styles.modalOverlay, themedStyles.modalOverlay]}
            onPress={handleIOSCancel}
          />
          <View style={[styles.modalSheet, themedStyles.modalContent]}>
            <View style={styles.modalHeader}>
              <Pressable onPress={handleIOSCancel} hitSlop={12}>
                <Text style={[styles.modalButtonText, themedStyles.cancelButton]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable onPress={handleIOSDone} hitSlop={12}>
                <Text style={[styles.modalButtonText, themedStyles.modalButton]}>
                  Done
                </Text>
              </Pressable>
            </View>
            <DateTimePicker
              value={tempDate ?? currentDate}
              mode={mode}
              display="spinner"
              onChange={handleChange}
              minimumDate={minimumDate}
              maximumDate={maximumDate}
              minuteInterval={minuteInterval}
              locale="en-GB"
              is24Hour
            />
          </View>
        </Modal>
      ) : null}

      {/* Android: native dialog */}
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

// ---------------------------------------------------------------------------
// Styles (color-independent)
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xxs,
  },
  label: {
    ...Typography.caption,
    fontWeight: '500',
    fontFamily: Fonts?.sans,
  },
  button: {
    height: Components.input.height,
    borderRadius: Components.input.borderRadius,
    paddingHorizontal: Components.input.paddingHorizontal,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  valueText: {
    fontSize: Typography.body.fontSize,
    lineHeight: Typography.body.lineHeight,
    fontFamily: Fonts?.sans,
    flex: 1,
  },
  helperBase: {
    ...Typography.caption,
    fontFamily: Fonts?.sans,
  },
  modalOverlay: {
    flex: 1,
  },
  modalSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 34, // safe area
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  modalButtonText: {
    ...Typography.body,
    fontWeight: '600',
    fontFamily: Fonts?.sans,
  },
});
