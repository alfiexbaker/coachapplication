/**
 * QuietHoursSelector Component
 *
 * A time range picker for configuring notification quiet hours.
 * Allows users to set a start and end time during which push notifications are suppressed.
 *
 * Features:
 * - Toggle quiet hours on/off
 * - Time picker for start and end times
 * - Visual preview of selected time range
 * - Handles overnight time ranges (e.g., 22:00 to 07:00)
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Modal, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { QuietHours } from '@/constants/types';

export interface QuietHoursSelectorProps {
  /** Current quiet hours configuration */
  value: QuietHours;
  /** Callback when quiet hours change */
  onChange: (quietHours: QuietHours) => void;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Loading state */
  loading?: boolean;
}

/**
 * Parse HH:mm string to Date object for time picker
 */
function parseTimeToDate(time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

/**
 * Format Date object to HH:mm string
 */
function formatDateToTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Format time for display (e.g., "10:00 PM")
 */
function formatTimeForDisplay(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

export function QuietHoursSelector({
  value,
  onChange,
  disabled = false,
  loading = false,
}: QuietHoursSelectorProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [tempTime, setTempTime] = useState<Date | null>(null);

  const handleToggle = useCallback(() => {
    onChange({
      ...value,
      enabled: !value.enabled,
    });
  }, [value, onChange]);

  const handleStartTimeChange = useCallback(
    (_event: unknown, selectedDate?: Date) => {
      if (Platform.OS === 'android') {
        setShowStartPicker(false);
      }
      if (selectedDate) {
        if (Platform.OS === 'ios') {
          setTempTime(selectedDate);
        } else {
          onChange({
            ...value,
            startTime: formatDateToTime(selectedDate),
          });
        }
      }
    },
    [value, onChange]
  );

  const handleEndTimeChange = useCallback(
    (_event: unknown, selectedDate?: Date) => {
      if (Platform.OS === 'android') {
        setShowEndPicker(false);
      }
      if (selectedDate) {
        if (Platform.OS === 'ios') {
          setTempTime(selectedDate);
        } else {
          onChange({
            ...value,
            endTime: formatDateToTime(selectedDate),
          });
        }
      }
    },
    [value, onChange]
  );

  const handleConfirmStartTime = useCallback(() => {
    if (tempTime) {
      onChange({
        ...value,
        startTime: formatDateToTime(tempTime),
      });
    }
    setTempTime(null);
    setShowStartPicker(false);
  }, [tempTime, value, onChange]);

  const handleConfirmEndTime = useCallback(() => {
    if (tempTime) {
      onChange({
        ...value,
        endTime: formatDateToTime(tempTime),
      });
    }
    setTempTime(null);
    setShowEndPicker(false);
  }, [tempTime, value, onChange]);

  const handleCancelPicker = useCallback(() => {
    setTempTime(null);
    setShowStartPicker(false);
    setShowEndPicker(false);
  }, []);

  const isOvernight = value.startTime > value.endTime;

  return (
    <View style={[styles.container, { backgroundColor: palette.card, borderColor: palette.border }]}>
      {/* Header with toggle */}
      <Clickable
        onPress={handleToggle}
        disabled={disabled || loading}
        style={styles.header}
      >
        <View style={[styles.iconContainer, { backgroundColor: `${palette.accent}15` }]}>
          <Ionicons name="moon" size={22} color={palette.accent} />
        </View>
        <View style={styles.headerContent}>
          <ThemedText type="defaultSemiBold" style={styles.title}>
            Quiet Hours
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
            Pause push notifications during set hours
          </ThemedText>
        </View>
        <View
          style={[
            styles.toggle,
            {
              backgroundColor: value.enabled ? palette.accent : palette.border,
            },
          ]}
        >
          <View
            style={[
              styles.toggleThumb,
              {
                transform: [{ translateX: value.enabled ? 20 : 0 }],
              },
            ]}
          />
        </View>
      </Clickable>

      {/* Time Range Selection (only shown when enabled) */}
      {value.enabled && (
        <View style={styles.timeSection}>
          <View style={styles.timeRow}>
            <View style={styles.timeLabelContainer}>
              <Ionicons name="time-outline" size={18} color={palette.muted} />
              <ThemedText style={[styles.timeLabel, { color: palette.muted }]}>From</ThemedText>
            </View>
            <Clickable
              onPress={() => {
                setTempTime(parseTimeToDate(value.startTime));
                setShowStartPicker(true);
              }}
              disabled={disabled || loading}
              style={[styles.timeButton, { backgroundColor: palette.background }]}
            >
              <ThemedText type="defaultSemiBold" style={styles.timeValue}>
                {formatTimeForDisplay(value.startTime)}
              </ThemedText>
              <Ionicons name="chevron-down" size={16} color={palette.muted} />
            </Clickable>
          </View>

          <View style={styles.timeRow}>
            <View style={styles.timeLabelContainer}>
              <Ionicons name="sunny-outline" size={18} color={palette.muted} />
              <ThemedText style={[styles.timeLabel, { color: palette.muted }]}>To</ThemedText>
            </View>
            <Clickable
              onPress={() => {
                setTempTime(parseTimeToDate(value.endTime));
                setShowEndPicker(true);
              }}
              disabled={disabled || loading}
              style={[styles.timeButton, { backgroundColor: palette.background }]}
            >
              <ThemedText type="defaultSemiBold" style={styles.timeValue}>
                {formatTimeForDisplay(value.endTime)}
              </ThemedText>
              <Ionicons name="chevron-down" size={16} color={palette.muted} />
            </Clickable>
          </View>

          {/* Info text */}
          <View style={[styles.infoContainer, { backgroundColor: `${palette.accent}10` }]}>
            <Ionicons name="information-circle" size={16} color={palette.accent} />
            <ThemedText style={[styles.infoText, { color: palette.accent }]}>
              {isOvernight
                ? `Notifications paused from ${formatTimeForDisplay(value.startTime)} until ${formatTimeForDisplay(value.endTime)} the next day`
                : `Notifications paused between ${formatTimeForDisplay(value.startTime)} and ${formatTimeForDisplay(value.endTime)}`}
            </ThemedText>
          </View>
        </View>
      )}

      {/* iOS Time Picker Modal */}
      {Platform.OS === 'ios' && (showStartPicker || showEndPicker) && (
        <Modal transparent animationType="slide" visible>
          <View style={styles.modalOverlay}>
            <View style={[styles.pickerContainer, { backgroundColor: palette.card }]}>
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={handleCancelPicker}>
                  <ThemedText style={[styles.pickerButton, { color: palette.muted }]}>
                    Cancel
                  </ThemedText>
                </TouchableOpacity>
                <ThemedText type="defaultSemiBold">
                  {showStartPicker ? 'Start Time' : 'End Time'}
                </ThemedText>
                <TouchableOpacity
                  onPress={showStartPicker ? handleConfirmStartTime : handleConfirmEndTime}
                >
                  <ThemedText style={[styles.pickerButton, { color: palette.accent }]}>
                    Done
                  </ThemedText>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempTime || parseTimeToDate(showStartPicker ? value.startTime : value.endTime)}
                mode="time"
                display="spinner"
                onChange={showStartPicker ? handleStartTimeChange : handleEndTimeChange}
                minuteInterval={15}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Android Time Picker */}
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

const styles = StyleSheet.create({
  container: {
    borderRadius: Radii.lg,
    borderWidth: 0.75,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 16,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    padding: 5,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  timeSection: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  timeLabel: {
    fontSize: 14,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    gap: Spacing.xs,
  },
  timeValue: {
    fontSize: 16,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.sm,
    borderRadius: Radii.md,
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  pickerContainer: {
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    paddingBottom: 34, // Safe area padding
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
  },
  pickerButton: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default QuietHoursSelector;
