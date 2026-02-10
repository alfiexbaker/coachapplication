/**
 * No-Show Category Sheet
 *
 * Bottom sheet shown when a coach marks an athlete as no-show.
 * Allows categorizing the reason with a structured set of options.
 * Mirrors the DeclineReasonSheet pattern.
 */

import { useState } from 'react';
import { View, StyleSheet, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { NoShowCategory } from '@/constants/session-types';
import { useTheme } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';

interface NoShowCategoryOption {
  key: NoShowCategory;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const CATEGORIES: NoShowCategoryOption[] = [
  { key: 'no_contact', label: 'No contact', icon: 'alert-circle-outline' },
  { key: 'cancelled_late', label: 'Cancelled late', icon: 'time-outline' },
  { key: 'arrived_late', label: 'Arrived late', icon: 'walk-outline' },
  { key: 'weather_travel', label: 'Weather / Travel', icon: 'rainy-outline' },
  { key: 'other', label: 'Other', icon: 'chatbubble-outline' },
];

export interface NoShowResult {
  category: NoShowCategory;
  note?: string;
}

interface NoShowCategorySheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (result: NoShowResult) => void;
  athleteName?: string;
}

export function NoShowCategorySheet({
  visible,
  onClose,
  onSubmit,
  athleteName,
}: NoShowCategorySheetProps) {
  const { colors: palette } = useTheme();
  const [selected, setSelected] = useState<NoShowCategory | null>(null);
  const [note, setNote] = useState('');

  const handleSelect = (key: NoShowCategory) => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(key);
  };

  const handleSubmit = () => {
    if (!selected) return;
    if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSubmit({
      category: selected,
      note: note.trim() || undefined,
    });
    setSelected(null);
    setNote('');
  };

  const handleClose = () => {
    setSelected(null);
    setNote('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={[styles.overlay, { backgroundColor: withAlpha(palette.text, 0.4) }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.sheet, { backgroundColor: palette.surface }]}>
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: palette.border }]} />

          {/* Header */}
          <Row style={styles.header}>
            <ThemedText type="subtitle">
              {athleteName ? `Mark ${athleteName} as no-show` : 'Mark as no-show'}
            </ThemedText>
            <Clickable accessibilityLabel="Close" onPress={handleClose}>
              <Ionicons name="close" size={24} color={palette.muted} />
            </Clickable>
          </Row>

          <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
            Select a reason to help track patterns
          </ThemedText>

          {/* Category Options */}
          <View style={styles.options}>
            {CATEGORIES.map((category) => {
              const isSelected = selected === category.key;
              return (
                <Clickable
                  key={category.key}
                  onPress={() => handleSelect(category.key)}
                  style={[
                    styles.option,
                    {
                      backgroundColor: isSelected
                        ? withAlpha(palette.error, 0.06)
                        : palette.background,
                      borderColor: isSelected ? palette.error : palette.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={category.icon}
                    size={20}
                    color={isSelected ? palette.error : palette.muted}
                  />
                  <ThemedText
                    style={[
                      styles.optionText,
                      { color: isSelected ? palette.error : palette.text },
                    ]}
                  >
                    {category.label}
                  </ThemedText>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={20} color={palette.error} />
                  )}
                </Clickable>
              );
            })}
          </View>

          {/* Note field */}
          {(selected === 'other' || note.length > 0) && (
            <TextInput
              style={[
                styles.noteInput,
                {
                  color: palette.text,
                  backgroundColor: palette.background,
                  borderColor: palette.border,
                },
              ]}
              placeholder="Add a note (optional)"
              placeholderTextColor={palette.muted}
              value={note}
              onChangeText={setNote}
              multiline
              maxLength={200}
            />
          )}

          {/* Submit */}
          <Clickable
            onPress={handleSubmit}
            style={[
              styles.submitBtn,
              {
                backgroundColor: selected ? palette.error : palette.border,
              },
            ]}
            disabled={!selected}
          >
            <Ionicons name="flag-outline" size={20} color={palette.onPrimary} />
            <ThemedText style={[styles.submitBtnText, { color: palette.onPrimary }]}>Record No-Show</ThemedText>
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subtitle: {
    ...Typography.bodySmall,
    marginTop: -Spacing.xs,
  },
  options: {
    gap: Spacing.sm,
  },
  option: {
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
  },
  optionText: {
    ...Typography.subheading,
    flex: 1,
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.md,
    minHeight: 80,
    textAlignVertical: 'top',
    ...Typography.body,
  },
  submitBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    marginTop: Spacing.xs,
  },
  submitBtnText: {
    ...Typography.bodySemiBold,
  },
});
