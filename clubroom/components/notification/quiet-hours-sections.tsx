import React, { memo } from 'react';
import { View, StyleSheet, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
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
    <Clickable onPress={onToggle} disabled={disabled} style={styles.header}>
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
      <View style={[styles.toggle, { backgroundColor: enabled ? palette.accent : palette.border }]}>
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
      <Row align="center" justify="between">
        <Row align="center" gap="xs">
          <Ionicons name="time-outline" size={18} color={palette.muted} />
          <ThemedText style={[styles.timeLabel, { color: palette.muted }]}>From</ThemedText>
        </Row>
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
      </Row>
      <Row align="center" justify="between">
        <Row align="center" gap="xs">
          <Ionicons name="sunny-outline" size={18} color={palette.muted} />
          <ThemedText style={[styles.timeLabel, { color: palette.muted }]}>To</ThemedText>
        </Row>
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
      </Row>
      <Row
        align="start"
        gap="xs"
        style={[styles.infoContainer, { backgroundColor: withAlpha(palette.accent, 0.06) }]}
      >
        <Ionicons name="information-circle" size={16} color={palette.accent} />
        <ThemedText style={[styles.infoText, { color: palette.accent }]}>
          {isOvernight
            ? `Notifications paused from ${formatTimeForDisplay(startTime)} until ${formatTimeForDisplay(endTime)} the next day`
            : `Notifications paused between ${formatTimeForDisplay(startTime)} and ${formatTimeForDisplay(endTime)}`}
        </ThemedText>
      </Row>
    </View>
  );
});
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
      <View style={[styles.modalOverlay, { backgroundColor: withAlpha(palette.text, 0.5) }]}>
        <View style={[styles.pickerContainer, { backgroundColor: palette.card }]}>
          <Row
            justify="between"
            align="center"
            style={[styles.pickerHeader, { borderBottomColor: palette.border }]}
          >
            <Clickable onPress={onCancel}>
              <ThemedText style={[styles.pickerButton, { color: palette.muted }]}>
                Cancel
              </ThemedText>
            </Clickable>
            <ThemedText type="defaultSemiBold">{title}</ThemedText>
            <Clickable onPress={onConfirm}>
              <ThemedText style={[styles.pickerButton, { color: palette.accent }]}>Done</ThemedText>
            </Clickable>
          </Row>
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
  subtitle: { ...Typography.small, lineHeight: Typography.caption.lineHeight },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: Radii.lg,
    padding: Spacing.xs,
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
    padding: Spacing.sm,
    borderRadius: Radii.md,
    marginTop: Spacing.xs,
  },
  infoText: { ...Typography.caption, flex: 1, lineHeight: Typography.micro.lineHeight },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    paddingBottom: 34,
  },
  pickerHeader: {
    padding: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerButton: { ...Typography.subheading },
});
