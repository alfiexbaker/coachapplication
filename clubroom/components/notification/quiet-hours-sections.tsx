/**
 * Extracted sub-components for QuietHoursSelector.
 *
 * Helpers: parseTimeToDate, formatDateToTime, formatTimeForDisplay.
 * QuietHoursHeader — toggle row with icon + label.
 * TimeRangeSection — from/to time pickers + info banner.
 * TimePickerModal — iOS modal time picker.
 */

import React, { memo } from 'react';
import { View, StyleSheet, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function parseTimeToDate(time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

export function formatDateToTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function formatTimeForDisplay(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

// ─── QuietHoursHeader ────────────────────────────────────────────────────────

interface QuietHoursHeaderProps {
  enabled: boolean;
  disabled: boolean;
  onToggle: () => void;
  palette: ThemeColors;
}

export const QuietHoursHeader = memo(function QuietHoursHeader({
  enabled,
  disabled,
  onToggle,
  palette,
}: QuietHoursHeaderProps) {
  return (
    <Clickable
      onPress={onToggle}
      disabled={disabled}
      style={styles.header}
    >
      <View style={[styles.iconContainer, { backgroundColor: withAlpha(palette.accent, 0.09) }]}>
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
          { backgroundColor: enabled ? palette.accent : palette.border },
        ]}
      >
        <View
          style={[
            styles.toggleThumb,
            {
              backgroundColor: palette.surface,
              transform: [{ translateX: enabled ? 20 : 0 }],
            },
          ]}
        />
      </View>
    </Clickable>
  );
});

// ─── TimeRangeSection ────────────────────────────────────────────────────────

interface TimeRangeSectionProps {
  startTime: string;
  endTime: string;
  disabled: boolean;
  onStartPress: () => void;
  onEndPress: () => void;
  palette: ThemeColors;
}

export const TimeRangeSection = memo(function TimeRangeSection({
  startTime,
  endTime,
  disabled,
  onStartPress,
  onEndPress,
  palette,
}: TimeRangeSectionProps) {
  const isOvernight = startTime > endTime;

  return (
    <View style={styles.timeSection}>
      <View style={styles.timeRow}>
        <View style={styles.timeLabelContainer}>
          <Ionicons name="time-outline" size={18} color={palette.muted} />
          <ThemedText style={[styles.timeLabel, { color: palette.muted }]}>From</ThemedText>
        </View>
        <Clickable
          onPress={onStartPress}
          disabled={disabled}
          style={[styles.timeButton, { backgroundColor: palette.background }]}
        >
          <ThemedText type="defaultSemiBold" style={styles.timeValue}>
            {formatTimeForDisplay(startTime)}
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
          onPress={onEndPress}
          disabled={disabled}
          style={[styles.timeButton, { backgroundColor: palette.background }]}
        >
          <ThemedText type="defaultSemiBold" style={styles.timeValue}>
            {formatTimeForDisplay(endTime)}
          </ThemedText>
          <Ionicons name="chevron-down" size={16} color={palette.muted} />
        </Clickable>
      </View>

      <View style={[styles.infoContainer, { backgroundColor: withAlpha(palette.accent, 0.06) }]}>
        <Ionicons name="information-circle" size={16} color={palette.accent} />
        <ThemedText style={[styles.infoText, { color: palette.accent }]}>
          {isOvernight
            ? `Notifications paused from ${formatTimeForDisplay(startTime)} until ${formatTimeForDisplay(endTime)} the next day`
            : `Notifications paused between ${formatTimeForDisplay(startTime)} and ${formatTimeForDisplay(endTime)}`}
        </ThemedText>
      </View>
    </View>
  );
});

// ─── TimePickerModal (iOS) ───────────────────────────────────────────────────

interface TimePickerModalProps {
  visible: boolean;
  title: string;
  value: Date;
  onChange: (event: unknown, date?: Date) => void;
  onConfirm: () => void;
  onCancel: () => void;
  palette: ThemeColors;
}

export const TimePickerModal = memo(function TimePickerModal({
  visible,
  title,
  value,
  onChange,
  onConfirm,
  onCancel,
  palette,
}: TimePickerModalProps) {
  if (!visible || Platform.OS !== 'ios') return null;

  return (
    <Modal transparent animationType="slide" visible>
      <View style={styles.modalOverlay}>
        <View style={[styles.pickerContainer, { backgroundColor: palette.card }]}>
          <View style={[styles.pickerHeader, { borderBottomColor: palette.border }]}>
            <Clickable onPress={onCancel}>
              <ThemedText style={[styles.pickerButton, { color: palette.muted }]}>
                Cancel
              </ThemedText>
            </Clickable>
            <ThemedText type="defaultSemiBold">{title}</ThemedText>
            <Clickable onPress={onConfirm}>
              <ThemedText style={[styles.pickerButton, { color: palette.accent }]}>
                Done
              </ThemedText>
            </Clickable>
          </View>
          <DateTimePicker
            value={value}
            mode="time"
            display="spinner"
            onChange={onChange}
            minuteInterval={15}
          />
        </View>
      </View>
    </Modal>
  );
});

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
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
    gap: Spacing.micro,
  },
  title: { ...Typography.subheading },
  subtitle: { ...Typography.small, lineHeight: 18 },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: Radii.lg,
    padding: 5,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: Radii.md,
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
  timeLabel: { ...Typography.bodySmall },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    gap: Spacing.xs,
  },
  timeValue: { ...Typography.subheading },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.sm,
    borderRadius: Radii.md,
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  infoText: { ...Typography.caption, flex: 1, lineHeight: 16 },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  pickerContainer: {
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    paddingBottom: 34,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerButton: { ...Typography.subheading },
});
