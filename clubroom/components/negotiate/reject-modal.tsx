import React, { memo } from 'react';
import { View, StyleSheet, TextInput, Modal } from 'react-native';
import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface RejectModalProps {
  visible: boolean;
  reason: string;
  onReasonChange: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export const RejectModal = memo(function RejectModal({ visible, reason, onReasonChange, onConfirm, onCancel }: RejectModalProps) {
  const { colors: palette } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Clickable
        style={[styles.overlay, { backgroundColor: withAlpha(palette.text, 0.5) }]}
        onPress={onCancel}
        accessibilityRole="button"
        accessibilityLabel="Close reject modal"
      >
        <Clickable style={[styles.content, { backgroundColor: palette.surface }]} onPress={() => {}} accessibilityRole="none">
          <ThemedText type="defaultSemiBold" style={styles.title}>Decline Proposal</ThemedText>
          <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
            Let them know why this time doesn&apos;t work (optional)
          </ThemedText>
          <TextInput
            style={[styles.input, { borderColor: palette.border, color: palette.text, backgroundColor: palette.background }]}
            placeholder="e.g., I have another commitment at that time"
            placeholderTextColor={palette.muted}
            value={reason} onChangeText={onReasonChange}
            multiline numberOfLines={3} textAlignVertical="top"
          />
          <Row gap="sm" style={styles.buttons}>
            <Clickable onPress={onCancel} style={[styles.cancelButton, { borderColor: palette.border }]}>
              <ThemedText>Cancel</ThemedText>
            </Clickable>
            <Clickable onPress={onConfirm} style={[styles.confirmButton, { backgroundColor: palette.error }]}>
              <ThemedText style={[styles.confirmText, { color: palette.onPrimary }]}>Decline</ThemedText>
            </Clickable>
          </Row>
        </Clickable>
      </Clickable>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  content: { width: '100%', maxWidth: 400, padding: Spacing.lg, borderRadius: Radii.lg, gap: Spacing.sm },
  title: { ...Typography.heading },
  subtitle: { ...Typography.small },
  input: { borderWidth: 1.5, borderRadius: Radii.md, padding: Spacing.md, ...Typography.body, minHeight: 80, marginTop: Spacing.xs },
  buttons: { marginTop: Spacing.sm },
  cancelButton: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, borderRadius: Radii.md, borderWidth: 1.5 },
  confirmButton: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, borderRadius: Radii.md },
  confirmText: { fontWeight: '600' } });
