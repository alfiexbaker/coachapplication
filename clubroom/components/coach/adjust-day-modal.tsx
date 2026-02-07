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
import { Colors, Spacing, Radii, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface AdjustDayModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: { startTime: string; endTime: string }) => void;
  date: string; // ISO date string
  dayName: string; // e.g. "Tuesday 11 Feb"
  templateStartTime?: string; // Current template default
  templateEndTime?: string;
}

export function AdjustDayModal({
  visible,
  onClose,
  onSave,
  dayName,
  templateStartTime,
  templateEndTime,
}: AdjustDayModalProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  useEffect(() => {
    if (visible) {
      setStartTime(templateStartTime || '09:00');
      setEndTime(templateEndTime || '17:00');
    }
  }, [visible, templateStartTime, templateEndTime]);

  const isValid = startTime && endTime && startTime < endTime;

  const handleSave = () => {
    if (!isValid) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave({ startTime, endTime });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.sheet, { backgroundColor: palette.surface }]}>
          <View style={[styles.handle, { backgroundColor: palette.border }]} />

          <View style={styles.header}>
            <ThemedText type="subtitle">Adjust Hours</ThemedText>
            <Clickable onPress={onClose}>
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

          <Clickable
            onPress={handleSave}
            style={[
              styles.saveBtn,
              { backgroundColor: isValid ? palette.tint : palette.border },
            ]}
          >
            <Ionicons name="checkmark" size={20} color={Colors.light.onPrimary} />
            <ThemedText style={styles.saveBtnText}>Save Override</ThemedText>
          </Clickable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
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
    color: Colors.light.onPrimary,
    fontWeight: '600',
    fontSize: Typography.body.fontSize,
  },
});
