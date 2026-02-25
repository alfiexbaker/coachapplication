/**
 * Decline Reason Sheet
 *
 * Bottom sheet shown when parent taps "Decline" on an invite.
 * Lets them pick a structured reason so the coach can adjust.
 */

import { useState } from 'react';
import { View, StyleSheet, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type DeclineReasonCategory =
  | 'schedule_conflict'
  | 'too_far'
  | 'price'
  | 'child_unavailable'
  | 'other';

interface DeclineReasonOption {
  key: DeclineReasonCategory;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const REASONS: DeclineReasonOption[] = [
  { key: 'schedule_conflict', label: 'Schedule conflict', icon: 'calendar-outline' },
  { key: 'too_far', label: 'Too far away', icon: 'location-outline' },
  { key: 'price', label: 'Price', icon: 'pricetag-outline' },
  { key: 'child_unavailable', label: 'Child unavailable', icon: 'person-outline' },
  { key: 'other', label: 'Other', icon: 'chatbubble-outline' },
];

export interface DeclineReasonResult {
  reason?: DeclineReasonCategory;
  note?: string;
}

interface DeclineReasonSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (result: DeclineReasonResult) => void;
  athleteName?: string;
}

export function DeclineReasonSheet({
  visible,
  onClose,
  onSubmit,
  athleteName,
}: DeclineReasonSheetProps) {
  const { colors: palette } = useTheme();
  const [selected, setSelected] = useState<DeclineReasonCategory | null>(null);
  const [note, setNote] = useState('');

  const handleSelect = (key: DeclineReasonCategory) => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(key);
  };

  const handleSubmit = () => {
    if (Platform.OS !== 'web')
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSubmit({
      reason: selected ?? undefined,
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
          <Row justify="between" align="center">
            <ThemedText type="subtitle">
              {athleteName ? `Can't make it for ${athleteName}?` : "Why can't you make it?"}
            </ThemedText>
            <Clickable onPress={handleClose} accessibilityLabel="Close">
              <Ionicons name="close" size={24} color={palette.muted} />
            </Clickable>
          </Row>

          <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
            This helps the coach adjust future invites (optional)
          </ThemedText>

          {/* Reason Options */}
          <View style={styles.options}>
            {REASONS.map((reason) => {
              const isSelected = selected === reason.key;
              return (
                <Clickable
                  key={reason.key}
                  onPress={() => handleSelect(reason.key)}
                  accessibilityLabel={reason.label}
                  style={[
                    styles.option,
                    {
                      backgroundColor: isSelected
                        ? withAlpha(palette.tint, 0.06)
                        : palette.background,
                      borderColor: isSelected ? palette.tint : palette.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={reason.icon}
                    size={20}
                    color={isSelected ? palette.tint : palette.muted}
                  />
                  <ThemedText
                    style={[styles.optionText, { color: isSelected ? palette.tint : palette.text }]}
                  >
                    {reason.label}
                  </ThemedText>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={20} color={palette.tint} />
                  )}
                </Clickable>
              );
            })}
          </View>

          {/* Note field — always visible, but especially relevant for "Other" */}
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
            accessibilityLabel="Send decline"
            style={[styles.submitBtn, { backgroundColor: palette.error }]}
          >
            <Ionicons name="close-outline" size={20} color={palette.onPrimary} />
            <ThemedText style={[styles.submitBtnText, { color: palette.onPrimary }]}>
              Send Decline
            </ThemedText>
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
    borderRadius: Radii.xs,
    alignSelf: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.bodySmall,
    marginTop: -Spacing.xs,
  },
  options: {
    gap: Spacing.sm,
  },
  option: {
    flexDirection: 'row',
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
    flexDirection: 'row',
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
