/**
 * Extracted helpers and sub-components for DateTimeField.
 *
 * IOSPickerModal — iOS spinner modal with Done/Cancel.
 */

import React from 'react';
import { Modal, Text, View } from 'react-native';
import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import { styles } from './date-time-field-helpers';

// ─── IOSPickerModal ───────────────────────────────────────────────────────────

interface IOSPickerModalProps {
  visible: boolean;
  mode: 'date' | 'time';
  tempDate: Date | null;
  currentDate: Date;
  onChange: (event: DateTimePickerEvent, selected?: Date) => void;
  onDone: () => void;
  onCancel: () => void;
  minimumDate?: Date;
  maximumDate?: Date;
  minuteInterval?: 1 | 2 | 3 | 4 | 5 | 6 | 10 | 12 | 15 | 20 | 30;
  colors: ThemeColors;
  themeVariant: 'light' | 'dark';
}

export const IOSPickerModal = function IOSPickerModal({
  visible,
  mode,
  tempDate,
  currentDate,
  onChange,
  onDone,
  onCancel,
  minimumDate,
  maximumDate,
  minuteInterval,
  colors,
  themeVariant,
}: IOSPickerModalProps) {
  if (!visible) return null;

  return (
    <Modal transparent animationType="slide">
      <Clickable
        style={[styles.modalOverlay, { backgroundColor: withAlpha(colors.text, 0.4) }]}
        onPress={onCancel}
        accessibilityRole="button"
        accessibilityLabel="Close date time picker"
      />
      <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
        <Row justify="between" style={styles.modalHeader}>
          <Clickable
            onPress={onCancel}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Cancel picker"
          >
            <Text style={[styles.modalButtonText, { color: colors.muted }]}>Cancel</Text>
          </Clickable>
          <Clickable
            onPress={onDone}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Confirm picker"
          >
            <Text style={[styles.modalButtonText, { color: colors.tint }]}>Done</Text>
          </Clickable>
        </Row>
        <DateTimePicker
          value={tempDate ?? currentDate}
          mode={mode}
          display="spinner"
          onChange={onChange}
          textColor={colors.text}
          themeVariant={themeVariant}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          minuteInterval={minuteInterval}
          locale="en-GB"
          is24Hour
        />
      </View>
    </Modal>
  );
};
