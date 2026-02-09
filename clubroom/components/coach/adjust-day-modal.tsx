/**
 * Adjust Day Modal
 *
 * Bottom sheet for adjusting availability hours on a single day
 * without changing the weekly recurring pattern.
 */

import { useState, useEffect } from 'react';
import { View, StyleSheet, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { DateTimeField } from '@/components/ui/primitives';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

// Re-export extracted components for backward compat
export { LOCATION_OPTIONS, LocationPicker } from './adjust-day-modal-sections';
export type { LocationPickerProps } from './adjust-day-modal-sections';

import { LocationPicker } from './adjust-day-modal-sections';

interface AdjustDayModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: { startTime: string; endTime: string; location?: string }) => void;
  date: string; // ISO date string
  dayName: string; // e.g. "Tuesday 11 Feb"
  templateStartTime?: string; // Current template default
  templateEndTime?: string;
  templateLocation?: string;
}

export function AdjustDayModal({
  visible,
  onClose,
  onSave,
  dayName,
  templateStartTime,
  templateEndTime,
  templateLocation,
}: AdjustDayModalProps) {
  const { colors: palette } = useTheme();

  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  useEffect(() => {
    if (visible) {
      setStartTime(templateStartTime || '09:00');
      setEndTime(templateEndTime || '17:00');
      setLocation(templateLocation || '');
      setShowCustomInput(false);
    }
  }, [visible, templateStartTime, templateEndTime, templateLocation]);

  const isValid = startTime && endTime && startTime < endTime;

  const handleSave = () => {
    if (!isValid) return;
    if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave({ startTime, endTime, location: location || undefined });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.overlay, { backgroundColor: withAlpha(palette.text, 0.4) }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.sheet, { backgroundColor: palette.surface }]}>
          <View style={[styles.handle, { backgroundColor: palette.border }]} />

          <View style={styles.header}>
            <ThemedText type="subtitle">Adjust Hours</ThemedText>
            <Clickable accessibilityLabel="Close" onPress={onClose}>
              <Ionicons name="close" size={24} color={palette.muted} />
            </Clickable>
          </View>

          <ThemedText style={[styles.dayLabel, { color: palette.muted }]}>
            {dayName} only — your weekly pattern stays the same
          </ThemedText>

          {templateStartTime && (
            <View style={[styles.templateHint, { backgroundColor: palette.background }]}>
              <Ionicons name="repeat" size={14} color={palette.muted} />
              <ThemedText style={[styles.templateHintText, { color: palette.muted }]}>
                Weekly template: {templateStartTime} – {templateEndTime}
              </ThemedText>
            </View>
          )}

          <View style={styles.timeRow}>
            <DateTimeField
              mode="time"
              label="Start Time"
              value={startTime}
              onChange={setStartTime}
              style={{ flex: 1 }}
            />
            <DateTimeField
              mode="time"
              label="End Time"
              value={endTime}
              onChange={setEndTime}
              style={{ flex: 1 }}
            />
          </View>

          {startTime && endTime && startTime >= endTime && (
            <ThemedText style={[styles.errorText, { color: palette.error }]}>
              End time must be after start time
            </ThemedText>
          )}

          <LocationPicker
            location={location}
            showCustomInput={showCustomInput}
            onLocationChange={setLocation}
            onShowCustomInput={setShowCustomInput}
            palette={palette}
          />

          <Clickable
            onPress={handleSave}
            style={[
              styles.saveBtn,
              { backgroundColor: isValid ? palette.tint : palette.border },
            ]}
          >
            <Ionicons name="checkmark" size={20} color={palette.onPrimary} />
            <ThemedText style={[styles.saveBtnText, { color: palette.onPrimary }]}>Save Override</ThemedText>
          </Clickable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing['2xl'],
    gap: Spacing.md,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayLabel: {
    ...Typography.bodySmall,
  },
  templateHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: Radii.sm,
  },
  templateHintText: {
    ...Typography.small,
  },
  timeRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  errorText: {
    ...Typography.small,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    marginTop: Spacing.sm,
  },
  saveBtnText: {
    ...Typography.bodySemiBold,
  },
});
